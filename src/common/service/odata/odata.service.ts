import { Router } from "express";
import { ExpressRouter, ODataControler } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "./controllers/product.odata.controller.js";
import { CategoryODataController } from "./controllers/category.odata.controller.js";
import { BatchMiddleware } from "../../middleware/batch.middleware.js";

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

export { oDataExpressApp };
