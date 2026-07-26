import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";

import "reflect-metadata";

import { env } from "./common/config/env.config.js";
import { oDataExpressApp } from "./common/service/odata/odata.service.js";
import { GlobalErrorMiddleware } from "./common/middleware/global-error.middleware.js";
import { GlobalRouter } from "./common/router/global.router.js";

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

    app.use("/api", GlobalRouter);
    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
