import type { Request, Response } from "express";
import { ODataControler, QueryParser } from "@phrasecode/odata";

const MAX_PARTS = 100;
const MAX_DEPTH = 5;

const STATUS_TEXT: Record<number, string> = {
    200: "OK",
    400: "Bad Request",
    404: "Not Found",
    405: "Method Not Allowed",
    415: "Unsupported Media Type",
    500: "Internal Server Error",
};

interface RawPart {
    headers: Record<string, string>;
    body: string;
}

interface DispatchResult {
    status: number;
    body: unknown;
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

function httpResponseBlock(status: number, body: unknown): string {
    const statusText = STATUS_TEXT[status] || "OK";
    return [
        "Content-Type: application/http",
        "Content-Transfer-Encoding: binary",
        "",
        `HTTP/1.1 ${status} ${statusText}`,
        "Content-Type: application/json",
        "",
        JSON.stringify(body),
    ].join("\r\n");
}

function assemble(blocks: string[], boundary: string): string {
    const separator = `--${boundary}\r\n`;
    return blocks.map((block) => separator + block).join("") + `--${boundary}--\r\n`;
}

async function dispatchRequest(
    method: string,
    url: string,
    registry: Map<string, ODataControler>,
): Promise<DispatchResult> {
    if (method.toUpperCase() !== "GET") {
        return {
            status: 405,
            body: {
                error:
                    "Only GET is supported inside $batch for v1.1.0. Use groupId '$direct' for write operations.",
            },
        };
    }

    const queryIndex = url.indexOf("?");
    let pathSegment = (queryIndex >= 0 ? url.substring(0, queryIndex) : url).replace(/^\//, "");
    let queryPart = queryIndex >= 0 ? url.substring(queryIndex + 1) : "";

    const keyMatch = pathSegment.match(/^([^/?(]+)\(([^)]+)\)$/);
    if (keyMatch) {
        const entitySet = keyMatch[1];
        const keyValue = keyMatch[2];
        const controller = registry.get(entitySet);
        let primaryKey = "id";
        if (controller) {
            try {
                const metadata = controller.getBaseModel().getMetadata();
                const pk = metadata.columnMetadata.find((column) => column.isPrimaryKey);
                if (pk) primaryKey = pk.propertyKey;
            } catch {
                // keep default primary key name
            }
        }
        const extra = new URLSearchParams();
        extra.set("$filter", `${primaryKey} eq ${keyValue}`);
        queryPart = queryPart ? `${queryPart}&${extra.toString()}` : extra.toString();
        pathSegment = entitySet;
    }

    const entitySet = pathSegment.split("/")[0];
    const controller = registry.get(entitySet);
    if (!controller) {
        return { status: 404, body: { error: `Entity set '${entitySet}' not found` } };
    }

    const normalizedQuery = new URLSearchParams(queryPart).toString();
    const queryString = `/${entitySet}?${normalizedQuery}`;
    const queryParser = new QueryParser(queryString, controller.getBaseModel());
    const result = await controller.get(queryParser);
    return { status: 200, body: result };
}

async function processHttpRequest(raw: string, registry: Map<string, ODataControler>): Promise<string> {
    const blankIndex = raw.search(/\r\n\r\n|\n\n/);
    const headerText = blankIndex >= 0 ? raw.substring(0, blankIndex) : raw;
    const requestLine = headerText.split(/\r\n|\n/)[0].trim().split(" ");
    const method = (requestLine[0] || "GET").toUpperCase();
    const lastToken = requestLine[requestLine.length - 1] || "";
    const url = requestLine
        .slice(1, lastToken.toUpperCase().startsWith("HTTP/") ? -1 : undefined)
        .join(" ");
    const result = await dispatchRequest(method, url, registry);
    return httpResponseBlock(result.status, result.body);
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
            blocks.push(await processHttpRequest(part.body, registry));
        } else if (partType.startsWith("multipart/mixed")) {
            const innerBoundary = boundaryOf(partType) || "changeset";
            const innerBlocks = await buildBlocks(part.body, innerBoundary, registry, depth + 1);
            const innerBody = assemble(innerBlocks, innerBoundary);
            blocks.push(
                [
                    `Content-Type: multipart/mixed; boundary=${innerBoundary}`,
                    "Content-Transfer-Encoding: binary",
                    "",
                    innerBody,
                ].join("\r\n"),
            );
        } else {
            blocks.push(httpResponseBlock(415, { error: "Unsupported part Content-Type" }));
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
