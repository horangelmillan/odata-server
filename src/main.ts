import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import type { DataSource } from "@phrasecode/odata";

import "reflect-metadata";

import { env } from "./common/config/env.config.js";
import { registerDataSource } from "./common/service/odata/datasource.js";
import { createODataExpressApp } from "./common/service/odata/odata.service.js";
import { domainRegistrations } from "./core/main.js";
import { GlobalErrorMiddleware } from "./common/middleware/global-error.middleware.js";

// RF1 (ciclo 16, F1): composition root. `main.ts` vive fuera de common/core:
// importa los registros de dominio (core) y las fábricas del kernel (common),
// enlaza el datasource a los write services y compone la app OData. El
// datasource se crea en `server.ts` y llega como parámetro (misma instancia
// para migraciones, sync y routing).
export default function (dataSource: DataSource): Express {
    registerDataSource(dataSource);

    const oDataExpressApp = createODataExpressApp(domainRegistrations, dataSource);

    const app: Express = express();

    const corsOptions = {
        exposedHeaders: ["OData-Version"],
    };

    app.use(helmet());
    app.use(cors(corsOptions));

    app.use(
        "/odata",
        (req, res, next) => {
            if (req.path.includes("$metadata")) req.url = "/$metadata";
            req.url = req.url.replace(/^\/demo\//, "/");
            req.url = req.url.replace(/\(('[^']*'|\d+)\)/g, (_, k) => "/" + k.replace(/^'|'$/g, ""));
            res.set("OData-Version", "4.0");
            next();
        },
        oDataExpressApp,
    );

    app.use(express.json());
    app.use(compression());

    if (env.isDev) {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined"));
    }

    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
