import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";

import "reflect-metadata";

import { env } from "./common/config/env.config.js";
import { GlobalErrorMiddleware } from "./common/middleware/global-error.middleware.js";
import { oDataExpressApp } from "./common/service/odata/odata.service.js";

export default function () {
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
            req.url = req.url.replace(/\((\d+)\)/g, "/$1");
            res.set("OData-Version", "4.0");
            next();
        },
        oDataExpressApp,
    );

    app.use(compression());

    if (env.isDev) {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined"));
    }

    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
