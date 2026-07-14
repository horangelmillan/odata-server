import { Router } from "express";
import { ExpressRouter } from "@phrasecode/odata";
import { dataSource } from "./datasource.js";
import { ProductODataController } from "./controllers/product.odata.controller.js";

const oDataExpressApp: Router = Router();

new ExpressRouter(oDataExpressApp, {
    controllers: [new ProductODataController()],
    dataSource,
    logger: {
        enabled: true,
        logLevel: process.env.NODE_ENV === "development" ? "INFO" : "ERROR",
        format: "JSON",
        advancedOptions: {
            logSqlQuery: process.env.NODE_ENV === "development",
            logDbExecutionTime: true,
            logDbQueryParameters: false,
        },
    },
});

export { oDataExpressApp };
