import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import { config } from "dotenv";

config();
import "reflect-metadata";

import { GlobalRouter } from "./common/router/global.router.js";
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
            res.set("OData-Version", "4.0");
            next();
        },
        oDataExpressApp,
    );

    app.use(express.json());
    app.use(compression());

    if (process.env.NODE_ENV === "development") {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined"));
    }

    app.use("/api", GlobalRouter);
    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
