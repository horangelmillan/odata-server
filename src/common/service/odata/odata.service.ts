import { Router } from "express";
import { ExpressRouter, ODataControler } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "../../../core/product/controller/product.odata.controller.js";
import { CategoryODataController } from "./controllers/category.odata.controller.js";
import { BatchMiddleware } from "../../middleware/batch.middleware.js";
import { registerWriteRoutes } from "./odata-write.routes.js";
import { stripFormat } from "./odata-format.js";
import { transformToCsdl } from "./odata-metadata.js";
import { injectEtag } from "./odata-etag.js";
import { normalizeErrorBody, type ODataErrorShape } from "./odata-error.js";

const oDataExpressApp: Router = Router();

const odataControllers: ODataControler[] = [new ProductODataController(), new CategoryODataController()];

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

// Fase R: $metadata CSDL JSON 4.01 válido para SAPUI5/OpenUI5 ODataModel v4.
// Se registra ANTES del ExpressRouter de la librería para ganar el match de ruta
// (el de la librería emite un CSDL+JSON custom que UI5 no puede bootstrappear).
// NOTA: `\\$` para que JS genere `/\$metadata`; path-to-regexp trata `$` sin
// escapar como ancla de fin de regex (igual que en /$count del parche).
oDataExpressApp.get("/\\$metadata", (_req, res) => {
    try {
        const controllerEndpoints = odataControllers.map((controller) => {
            const endpoint = controller.getEndpoint();
            return {
                modelName: controller.getBaseModel().getModelName(),
                endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
            };
        });
        const rawMetadata = dataSource.getMetadata(controllerEndpoints);
        res.set("X-Metadata-Engine", "csdl-v4");
        res.send(transformToCsdl(rawMetadata));
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
