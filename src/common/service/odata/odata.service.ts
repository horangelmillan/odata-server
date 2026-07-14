import { Router } from "express";
import { ExpressRouter } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "./controllers/product.odata.controller.js";

const oDataExpressApp: Router = Router();

new ExpressRouter(oDataExpressApp, {
    controllers: [new ProductODataController()],
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

export { oDataExpressApp };
