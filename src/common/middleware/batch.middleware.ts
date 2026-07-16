import type { Request, Response } from "express";
import type { Transaction } from "sequelize";
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { odataWriteService, type ODataBaseModel } from "../service/odata/odata-write.service.js";
import { stripFormat } from "../service/odata/odata-format.js";
import { injectEtag, etagMatches } from "../service/odata/odata-etag.js";
import { oDataError } from "../service/odata/odata-error.js";

const MAX_PARTS = 100;
const MAX_DEPTH = 5;

const STATUS_TEXT: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    404: "Not Found",
    405: "Method Not Allowed",
    412: "Precondition Failed",
    415: "Unsupported Media Type",
    500: "Internal Server Error",
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface RawPart {
    headers: Record<string, string>;
    body: string;
}

interface ResponseBlock {
    status: number;
    body?: unknown;
    location?: string;
    contentId?: string;
}

// Correlaciona Content-ID -> clave de la entidad creada dentro del mismo
// changeset, para resolver referencias `$<contentId>` (deep-create de SAPUI5).
type ContentIdKeys = Map<string, unknown>;

class ChangesetError extends Error {
    constructor(
        public readonly status: number,
        public readonly detail: unknown,
    ) {
        super(typeof detail === "string" ? detail : "Changeset failed");
    }
}

function boundaryOf(contentType: string): string | null {
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return null;
    return (match[1] || match[2]).trim();
}

function contentTypeOf(headers: Record<string, string>): string {
    return (headers["content-type"] || "").toLowerCase();
}

function splitHeaders(headerText: string): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const line of headerText.split(/\r\n|\n/)) {
        const idx = line.indexOf(":");
        if (idx > 0) {
            headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
        }
    }
    return headers;
}

function parseMultipart(body: string, boundary: string): RawPart[] {
    const delimiter = `--${boundary}`;
    const segments = body.split(delimiter);
    const parts: RawPart[] = [];
    for (let i = 1; i < segments.length - 1; i++) {
        let segment = segments[i];
        if (segment.startsWith("\r\n")) segment = segment.slice(2);
        else if (segment.startsWith("\n")) segment = segment.slice(1);
        const headerEnd = segment.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        const headerText = segment.slice(0, headerEnd);
        let partBody = segment.slice(headerEnd + 4);
        if (partBody.endsWith("\r\n")) partBody = partBody.slice(0, -2);
        else if (partBody.endsWith("\n")) partBody = partBody.slice(0, -1);
        parts.push({ headers: splitHeaders(headerText), body: partBody });
    }
    return parts;
}

function readBody(req: Request): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        req.on("error", reject);
    });
}

function httpResponseBlock(response: ResponseBlock): string {
    const statusText = STATUS_TEXT[response.status] || "OK";
    const mimeHeaders = ["Content-Type: application/http", "Content-Transfer-Encoding: binary"];
    if (response.contentId) mimeHeaders.push(`Content-ID: ${response.contentId}`);

    const hasBody = response.body !== undefined && response.body !== null;
    const httpLines = [`HTTP/1.1 ${response.status} ${statusText}`];
    if (response.location) httpLines.push(`Location: ${response.location}`);
    if (hasBody) {
        httpLines.push("Content-Type: application/json");
        httpLines.push("");
        httpLines.push(JSON.stringify(response.body));
    } else {
        httpLines.push("");
    }
    return [...mimeHeaders, "", ...httpLines].join("\r\n");
}

function assemble(blocks: string[], boundary: string): string {
    const separator = `--${boundary}\r\n`;
    return blocks.map((block) => separator + block).join("") + `--${boundary}--\r\n`;
}

function changesetWrapper(innerBody: string, innerBoundary: string): string {
    return [
        `Content-Type: multipart/mixed; boundary=${innerBoundary}`,
        "Content-Transfer-Encoding: binary",
        "",
        innerBody,
    ].join("\r\n");
}

interface ParsedHttpRequest {
    method: string;
    url: string;
    body: string;
    headers: Record<string, string>;
}

function parseHttpPart(raw: string): ParsedHttpRequest {
    const match = raw.match(/\r\n\r\n|\n\n/);
    const separatorIndex = match ? (match.index ?? -1) : -1;
    const separatorLength = match ? match[0].length : 0;
    const head = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw;
    const body = separatorIndex >= 0 ? raw.slice(separatorIndex + separatorLength).trim() : "";

    const headLines = head.split(/\r\n|\n/);
    const requestLine = headLines[0].trim().split(" ");
    const method = (requestLine[0] || "GET").toUpperCase();
    const lastToken = requestLine[requestLine.length - 1] || "";
    const url = requestLine
        .slice(1, lastToken.toUpperCase().startsWith("HTTP/") ? -1 : undefined)
        .join(" ");

    // G1: extrae los headers del request HTTP interno (OData-Version, Accept,
    // Content-Type y, sobre todo, `If-Match` que SAPUI5 emite aquí para la
    // concurrencia optimista dentro del changeset).
    const headers: Record<string, string> = {};
    for (let i = 1; i < headLines.length; i++) {
        const idx = headLines[i].indexOf(":");
        if (idx > 0) headers[headLines[i].slice(0, idx).trim().toLowerCase()] = headLines[i].slice(idx + 1).trim();
    }
    return { method, url, body, headers };
}

interface ResolvedTarget {
    entitySet: string;
    controller: ODataControler;
    key: string | null;
    queryPart: string;
    primaryKey: string;
}

function primaryKeyOf(controller: ODataControler): string {
    try {
        const metadata = controller.getBaseModel().getMetadata();
        const pk = metadata.columnMetadata.find((column) => column.isPrimaryKey);
        if (pk) return pk.propertyKey;
    } catch {
        // fall through
    }
    return "id";
}

function resolveTarget(url: string, registry: Map<string, ODataControler>): ResolvedTarget | null {
    const queryIndex = url.indexOf("?");
    const pathSegment = (queryIndex >= 0 ? url.substring(0, queryIndex) : url).replace(/^\//, "");
    const queryPart = queryIndex >= 0 ? url.substring(queryIndex + 1) : "";

    const keyMatch = pathSegment.match(/^([^/?(]+)\(([^)]+)\)$/);
    const slashMatch = pathSegment.match(/^([^/?(]+)\/([^/?]+)$/);

    let entitySet: string;
    let key: string | null = null;
    if (keyMatch) {
        entitySet = keyMatch[1];
        key = keyMatch[2].trim();
    } else if (slashMatch) {
        entitySet = slashMatch[1];
        key = slashMatch[2].trim();
    } else {
        entitySet = pathSegment.split("/")[0];
    }

    const controller = registry.get(entitySet);
    if (!controller) return null;

    if (key && (key.startsWith("'") || key.startsWith('"'))) {
        key = key.slice(1, -1);
    }

    return { entitySet, controller, key, queryPart, primaryKey: primaryKeyOf(controller) };
}

function resolveContentIdReference(key: string | null, contentIdKeys: ContentIdKeys): unknown {
    if (key === null) return null;
    if (key.startsWith("$")) {
        const referenced = contentIdKeys.get(key.slice(1));
        return referenced ?? key;
    }
    return key;
}

async function dispatchRead(
    target: ResolvedTarget,
    controller: ODataControler,
): Promise<ResponseBlock> {
    let pathEntity = target.entitySet;

    // Fase I: negociación de `$format` dentro del $batch. JSON -> se elimina;
    // otro formato -> 415 (el QueryParser rechazaría `$format` con 400).
    const format = stripFormat(target.queryPart);
    if (format.unsupported) {
        return { status: 415, body: oDataError(415, "Unsupported $format; only JSON is supported") };
    }
    let queryPart = format.query;

    if (target.key !== null) {
        const extra = new URLSearchParams();
        extra.set("$filter", `${target.primaryKey} eq ${target.key}`);
        queryPart = queryPart ? `${queryPart}&${extra.toString()}` : extra.toString();
    }

    // El router parcheado decodifica el query antes del QueryParser; aquí
    // URLSearchParams re-codifica (`(`->`%28`, `,`->`%2C`) y el QueryParser no
    // entiende paréntesis codificados, por lo que decodificamos para mantener el
    // mismo comportamiento que la ruta GET directa (Fase G).
    const normalizedQuery = new URLSearchParams(queryPart).toString();
    const queryString = `/${pathEntity}?${normalizedQuery}`;
    const queryParser = new QueryParser(decodeURIComponent(queryString), controller.getBaseModel());
    const result = await controller.get(queryParser);
    // G1: inyecta `@odata.etag` en la respuesta de lectura del $batch para que
    // SAPUI5 pueda aplicar concurrencia optimista sobre las entidades leídas.
    injectEtag(result);
    return { status: 200, body: result };
}

function parseJsonBody(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        throw new ChangesetError(400, "Invalid JSON body in changeset request");
    }
}

async function dispatchWrite(
    method: string,
    target: ResolvedTarget,
    body: string,
    tx: Transaction,
    contentIdKeys: ContentIdKeys,
    ifMatch?: string,
): Promise<ResponseBlock> {
    const model = target.controller.getBaseModel() as unknown as ODataBaseModel;
    const locationBase = `/odata/${target.entitySet}`;

    if (method === "POST") {
        const data = parseJsonBody(body);
        const result = await odataWriteService.create(model, data, tx);
        injectEtag(result.entity);
        return {
            status: 201,
            body: result.entity,
            location: `${locationBase}(${result.key})`,
        };
    }

    const key = resolveContentIdReference(target.key, contentIdKeys);
    if (key === null) {
        throw new ChangesetError(400, `${method} requires an entity key`);
    }

    // G1: concurrencia optimista (opt-in). Solo se valida `If-Match` cuando el
    // request interno lo incluye; si no, se comporta como antes (compatibilidad
    // con clientes que no usan etag).
    if (ifMatch !== undefined) {
        const currentEtag = await odataWriteService.getCurrentEtag(model, key);
        if (currentEtag === null) {
            throw new ChangesetError(404, `Entity '${target.entitySet}(${String(key)})' not found`);
        }
        if (!etagMatches(ifMatch, currentEtag)) {
            throw new ChangesetError(412, `ETag mismatch for '${target.entitySet}(${String(key)})'`);
        }
    }

    if (method === "PATCH" || method === "PUT") {
        const data = parseJsonBody(body);
        const result = await odataWriteService.update(model, key, data, tx);
        if (!result.entity) {
            throw new ChangesetError(404, `Entity '${target.entitySet}(${String(key)})' not found`);
        }
        injectEtag(result.entity);
        return { status: 200, body: result.entity };
    }

    // DELETE
    const removal = await odataWriteService.remove(model, key, tx);
    if (!removal.deleted) {
        throw new ChangesetError(404, `Entity '${target.entitySet}(${String(key)})' not found`);
    }
    return { status: 204 };
}

async function processChangeset(
    rawBody: string,
    boundary: string,
    registry: Map<string, ODataControler>,
    depth: number,
): Promise<string> {
    if (depth > MAX_DEPTH) throw new Error("Changeset nesting too deep");
    const parts = parseMultipart(rawBody, boundary);
    if (parts.length > MAX_PARTS) throw new Error(`Too many parts in $batch (max ${MAX_PARTS})`);

    const innerBlocks: string[] = [];
    const contentIdKeys: ContentIdKeys = new Map();

    // Un changeset solo-lectura (SAPUI5 envuelve GETs en multipart/mixed) no
    // necesita transacción; solo abrimos una cuando hay escrituras, para que la
    // atomicidad aplique únicamente a POST/PUT/PATCH/DELETE.
    const hasWrites = parts.some((part) => WRITE_METHODS.has(parseHttpPart(part.body).method));

    // tx es null en changesets de solo lectura; dispatchWrite lo exige por firma.
    const runLoop = async (tx: Transaction | null): Promise<void> => {
        for (const part of parts) {
            if (!contentTypeOf(part.headers).startsWith("application/http")) {
                throw new ChangesetError(400, "Changesets only accept application/http parts");
            }
            const contentId = part.headers["content-id"];
            const { method, url, body, headers } = parseHttpPart(part.body);

            const target = resolveTarget(url, registry);
            if (!target) {
                throw new ChangesetError(404, `Entity set not found for '${url}'`);
            }

            // SAPUI5 (ODataModel v4) envía lecturas dentro de un
            // multipart/mixed; las tratamos como GET de solo lectura. Solo
            // POST/PUT/PATCH/DELETE participan en la atomicidad del changeset.
            if (method === "GET") {
                const response = await dispatchRead(target, target.controller);
                innerBlocks.push(httpResponseBlock({ ...response, contentId }));
                continue;
            }

            if (!WRITE_METHODS.has(method)) {
                throw new ChangesetError(405, `Method '${method}' is not allowed inside a changeset`);
            }

            const response = await dispatchWrite(method, target, body, tx as Transaction, contentIdKeys, headers["if-match"]);
            if (contentId && response.location) {
                const keyMatch = response.location.match(/\(([^)]+)\)$/);
                if (keyMatch) contentIdKeys.set(contentId, keyMatch[1]);
            }
            innerBlocks.push(httpResponseBlock({ ...response, contentId }));
        }
    };

    try {
        if (hasWrites) {
            await odataWriteService.runInTransaction((tx) => runLoop(tx));
        } else {
            await runLoop(null);
        }
        return changesetWrapper(assemble(innerBlocks, boundary), boundary);
    } catch (error) {
        // La transacción ya hizo rollback: todo el changeset falla de forma
        // atómica y se responde con un único error (spec OData).
        if (error instanceof ChangesetError) {
            // G2: mensaje estándar según el status (p.ej. "Precondition Failed"
            // para 412) para que SAPUI5 `MessageManager` lo muestre correctamente;
            // el detalle conserva el diagnóstico específico (p.ej. la entidad).
            const message = STATUS_TEXT[error.status] || "Changeset rolled back";
            return httpResponseBlock({
                status: error.status,
                body: oDataError(error.status, message, typeof error.detail === "string" ? error.detail : undefined),
            });
        }
        return httpResponseBlock({
            status: 500,
            body: oDataError(500, "Changeset rolled back", (error as Error).message),
        });
    }
}

async function processTopLevelRequest(
    raw: string,
    registry: Map<string, ODataControler>,
): Promise<string> {
    const { method, url } = parseHttpPart(raw);
    if (method !== "GET") {
        // Fuera de un changeset solo se admiten lecturas; las escrituras deben
        // ir en un multipart/mixed (spec OData $batch).
        return httpResponseBlock({
            status: 405,
            body: oDataError(405, "Write operations must be sent inside a changeset (multipart/mixed)"),
        });
    }
    const target = resolveTarget(url, registry);
    if (!target) {
        return httpResponseBlock({ status: 404, body: oDataError(404, `Entity set not found for '${url}'`) });
    }
    const response = await dispatchRead(target, target.controller);
    return httpResponseBlock(response);
}

async function buildBlocks(
    rawBody: string,
    boundary: string,
    registry: Map<string, ODataControler>,
    depth: number,
): Promise<string[]> {
    if (depth > MAX_DEPTH) throw new Error("Changeset nesting too deep");
    const parts = parseMultipart(rawBody, boundary);
    if (parts.length > MAX_PARTS) throw new Error(`Too many parts in $batch (max ${MAX_PARTS})`);

    const blocks: string[] = [];
    for (const part of parts) {
        const partType = contentTypeOf(part.headers);
        if (partType.startsWith("application/http")) {
            blocks.push(await processTopLevelRequest(part.body, registry));
        } else if (partType.startsWith("multipart/mixed")) {
            const innerBoundary = boundaryOf(partType) || "changeset";
            blocks.push(await processChangeset(part.body, innerBoundary, registry, depth + 1));
        } else {
            blocks.push(httpResponseBlock({ status: 415, body: oDataError(415, "Unsupported part Content-Type") }));
        }
    }
    return blocks;
}

export class BatchMiddleware {
    static handler(registry: Map<string, ODataControler>): (req: Request, res: Response) => void {
        return async (req, res) => {
            try {
                const contentType = req.headers["content-type"] || "";
                const boundary = boundaryOf(contentType);
                if (!contentType.toLowerCase().includes("multipart/mixed") || !boundary) {
                    res.status(400).json({
                        error: "Invalid $batch Content-Type; expected multipart/mixed with a boundary",
                    });
                    return;
                }

                const rawBody = await readBody(req);
                const blocks = await buildBlocks(rawBody, boundary, registry, 0);
                const body = assemble(blocks, boundary);
                res.set("Content-Type", `multipart/mixed; boundary=${boundary}`);
                res.status(200).send(body);
            } catch (error) {
                res.status(500).json({
                    error: "Error processing $batch",
                    detail: (error as Error).message,
                });
            }
        };
    }
}
