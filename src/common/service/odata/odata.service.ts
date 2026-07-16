import { Router } from "express";
import { ExpressRouter, ODataControler } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "../../../core/demo/product/controller/product.odata.controller.js";
import { CategoryODataController } from "../../../core/demo/category/controller/category.odata.controller.js";
import { CompanyODataController } from "../../../core/finance/company/controller/company.odata.controller.js";
import { CustomerODataController } from "../../../core/finance/customer/controller/customer.odata.controller.js";
import { SupplierODataController } from "../../../core/finance/supplier/controller/supplier.odata.controller.js";
import { GlAccountODataController } from "../../../core/finance/glaccount/controller/glaccount.odata.controller.js";
import { BatchMiddleware } from "../../middleware/batch.middleware.js";
import { registerWriteRoutes } from "./odata-write.routes.js";
import { stripFormat } from "./odata-format.js";
import { transformToCsdl, csdlToEdmx } from "./odata-metadata.js";
import { injectEtag } from "./odata-etag.js";
import { normalizeErrorBody, type ODataErrorShape } from "./odata-error.js";

const oDataExpressApp: Router = Router();

const odataControllers: ODataControler[] = [new ProductODataController(), new CategoryODataController(), new CompanyODataController(), new CustomerODataController(), new SupplierODataController(), new GlAccountODataController()];

// Normaliza el path OData: Express NO decodifica `%24`->`$` antes del route
// matching, así que `/%24count` (u `%24metadata`/`%24batch`) no matchea la ruta
// `/$count` y cae en `/:id` (id=`$count`) -> "Column $count not found".
// Decodificamos los tokens OData del path antes de que rutas se evalúen.
// Ver docs/pruebas-odata-product.md §5.
oDataExpressApp.use((req, _res, next) => {
    req.url = req.url
        .replace(/%24count/gi, "$count")
        .replace(/%24metadata/gi, "$metadata")
        .replace(/%24batch/gi, "$batch");
    next();
});

// Fase I: negociación de `$format`. El validador de @phrasecode/odata rechaza
// `$format` con 400; aquí lo interceptamos: JSON -> se elimina del query;
// cualquier otro formato -> 415 Unsupported Media Type. Ver odata-format.ts.
oDataExpressApp.use((req, res, next) => {
    const queryIndex = req.url.indexOf("?");
    if (queryIndex < 0) return next();

    const path = req.url.substring(0, queryIndex);
    const { query, unsupported } = stripFormat(req.url.substring(queryIndex + 1));
    if (unsupported) {
        res.status(415).json({ error: "Unsupported $format; only JSON is supported" });
        return;
    }
    req.url = query ? `${path}?${query}` : path;
    next();
});

// Fase R/F6: $metadata. SAPUI5/OpenUI5 ODataModel v4 (runtime 1.150) consume EDMX
// XML en `$metadata`, así que por defecto servimos EDMX estándar para que el cliente
// bootstrappee SIN shim. Si el cliente negocia `application/json` (Accept/`-format`),
// servimos el CSDL JSON 4.01 equivalente.
// Se registra ANTES del ExpressRouter de la librería para ganar el match de ruta
// (el de la librería emite un CSDL+JSON custom que UI5 no puede bootstrappear).
// NOTA: `\\$` para que JS genere `/\$metadata`; path-to-regexp trata `$` sin
// escapar como ancla de fin de regex (igual que en /$count del parche).
// G1 (F6 / benchmark): el `$metadata` es estático durante la vida del server
// (los modelos OData no cambian en runtime). Lo cacheamos por formato para no
// re-calcular la transformación CSDL->EDMX en cada request (la generación de EDMX
// XML era ~55% más lenta que el CSDL JSON del baseline, regresión medida en Fase P).
const metadataCache = new Map<string, string>();

oDataExpressApp.get("/\\$metadata", (req, res) => {
    try {
        const accept = String(req.headers["accept"] ?? "");
        const wantsJson = /application\/json/.test(accept) ||
            /\$format=json/.test(String(req.url));

        const cacheKey = wantsJson ? "csdl" : "edmx";
        let body = metadataCache.get(cacheKey);
        if (body === undefined) {
            const controllerEndpoints = odataControllers.map((controller) => {
                const endpoint = controller.getEndpoint();
                return {
                    modelName: controller.getBaseModel().getModelName(),
                    endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
                    isQueryModel: false,
                };
            });
            const rawMetadata = dataSource.getMetadata(controllerEndpoints);
            const csdl = transformToCsdl(rawMetadata);
            const rendered: string = wantsJson ? JSON.stringify(csdl) : csdlToEdmx(csdl);
            body = rendered;
            metadataCache.set(cacheKey, body);
        }

        if (wantsJson) {
            res.set("Content-Type", "application/json; charset=utf-8");
            res.set("X-Metadata-Engine", "csdl-v4-json");
            res.send(body);
            return;
        }
        res.set("Content-Type", "application/xml; charset=utf-8");
        res.set("OData-Version", "4.0");
        res.set("X-Metadata-Engine", "edmx-v4");
        res.send(body);
    } catch (error) {
        res.status(500).json({
            error: "Error generating $metadata",
            detail: (error as Error).message,
        });
    }
});

// G1: inyecta `@odata.etag` en las respuestas OData (colección, entidad
// individual y navegaciones `$expand`) para que SAPUI5 `ODataModel` v4 pueda
// aplicar control de concurrencia optimista. Se envuelve `res.json` (la ruta
// GET de la librería y la de `$metadata` serializan vía este método).
oDataExpressApp.use((_req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
        // G2: red de seguridad — cualquier cuerpo de error (incluido el emitido
        // por el path de lectura de @phrasecode/odata, p.ej.
        // `{error:"msg"}`) se normaliza al formato OData v4 estándar que
        // SAPUI5 `MessageManager` sabe parsear.
        const normalized = normalizeErrorBody(body, res.statusCode);
        const isError =
            normalized &&
            typeof normalized === "object" &&
            typeof (normalized as ODataErrorShape).error?.message === "string";
        if (!isError) injectEtag(normalized);
        // G1 (HTTP ETag): SAPUI5 `ODataModel` v4 usa el header HTTP `ETag` (no el
        // `@odata.etag` del cuerpo) para la cabecera `If-Match` de concurrencia
        // optimista. Emitimos un `ETag` fuerte e idéntico al `@odata.etag` para
        // que la validación `If-Match` del server coincida. Si no lo hacemos,
        // `compression` genera un `ETag` weak basado en el hash del cuerpo que
        // no corresponde al etag de la entidad y UI5 recibe 412 en todo update.
        const etag = (normalized as Record<string, unknown>)?.["@odata.etag"];
        if (typeof etag === "string") res.set("ETag", etag);
        return originalJson(normalized);
    };
    next();
});

new ExpressRouter(oDataExpressApp, {
    controllers: odataControllers,
    dataSource,
    logger: {
        enabled: true,
        logLevel: env.isDev ? "INFO" : "ERROR",
        format: "JSON",
        advancedOptions: {
            logSqlQuery: env.isDev,
            logDbExecutionTime: true,
            logDbQueryParameters: false,
        },
    },
});

const batchRegistry = new Map<string, ODataControler>();
odataControllers.forEach((controller) => {
    batchRegistry.set(controller.getEndpoint(), controller);
});

oDataExpressApp.post("/\\$batch", BatchMiddleware.handler(batchRegistry));

// Escritura directa (modo $direct de SAPUI5): POST/PATCH/PUT/DELETE por entidad.
registerWriteRoutes(oDataExpressApp, odataControllers);

export { oDataExpressApp };
