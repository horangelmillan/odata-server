import { Router } from "express";
import { ExpressRouter, ODataControler } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "./controllers/product.odata.controller.js";
import { CategoryODataController } from "./controllers/category.odata.controller.js";
import { BatchMiddleware } from "../../middleware/batch.middleware.js";
import { registerWriteRoutes } from "./odata-write.routes.js";
import { stripFormat } from "./odata-format.js";

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
