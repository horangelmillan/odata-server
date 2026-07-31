import morgan from "morgan";
import express, { Express } from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { DataSource } from "@phrasecode/odata";
import type { Sequelize } from "sequelize";

import "reflect-metadata";

import { env } from "./common/config/env.config.js";
import { registerDataSource, getDataSource } from "./common/service/odata/datasource.js";
import { createODataExpressApp } from "./common/service/odata/odata.service.js";
import { domainRegistrations } from "./core/main.js";
import { authController } from "./core/auth/main.js";
import { GlobalErrorMiddleware } from "./common/middleware/global-error.middleware.js";
import { AuthMiddleware } from "./common/middleware/auth.middleware.js";
import { HealthzMiddleware } from "./common/middleware/healthz.middleware.js";

interface DataSourceInternal {
    sequelizerAdaptor: { sequelize: Sequelize };
}

// F2 (ciclo 16): rate-limit de escrituras en `/odata` (solo prod). Los POST
// (y $batch, que también es POST) quedan limitados por IP; lecturas y
// `$metadata` no se limitan. La librería no tiene dependencias de runtime
// (IF2 resuelta: se incorpora).
const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !["POST", "PUT", "PATCH", "DELETE"].includes(req.method),
    message: { error: "too many requests" },
});

// RF1 (ciclo 16, F1): composition root. `main.ts` vive fuera de common/core:
// importa los registros de dominio (core) y las fábricas del kernel (common),
// enlaza el datasource a los write services y compone la app OData. El
// datasource se crea en `server.ts` y llega como parámetro (misma instancia
// para migraciones, sync y routing).
export default function (dataSource: DataSource): Express {
    registerDataSource(dataSource);

    const oDataExpressApp = createODataExpressApp(domainRegistrations, dataSource);

    const app: Express = express();

    // F2 (D2): CORS por entorno. Dev/test: abierto. Prod: solo `CORS_ORIGIN`
    // (fail-fast en env.config si falta). Se usa la forma callback: con un
    // string fijo el paquete `cors` lo aplicaría a CUALQUIER origen (no
    // restringe); con callback + boolean solo el origen permitido recibe
    // headers CORS.
    const corsOptions: Record<string, unknown> = {
        exposedHeaders: ["OData-Version"],
    };
    if (env.isProd) {
        corsOptions.origin = (
            origin: string | undefined,
            callback: (err: Error | null, allow?: boolean) => void,
        ) => {
            callback(null, origin === env.corsOrigin);
        };
    }

    app.use(helmet());
    app.use(cors(corsOptions));

    // F2 (D6): liveness público (healthcheck del compose prod en F3). El
    // resolver es perezoso: los test doubles de DataSource no exponen
    // `sequelizerAdaptor`, así que solo se toca al responder /healthz.
    app.get(
        "/healthz",
        HealthzMiddleware.handler(
            () => (getDataSource() as unknown as DataSourceInternal).sequelizerAdaptor.sequelize,
        ),
    );

    // F2 (D2): modo estricto solo en producción. `/healthz` y `$metadata` son
    // públicos (DA1); el resto de `/odata` exige Bearer JWT.
    if (env.isProd) {
        app.use("/odata", writeLimiter);
        app.use("/odata", (req, res, next) => {
            if (req.path.includes("$metadata")) {
                next();
                return;
            }
            AuthMiddleware.requireBearerToken()(req, res, next);
        });
    }

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

    // F2 (D2): login público (emite el JWT que exige el modo estricto).
    app.use("/auth", authController);

    if (env.isDev) {
        app.use(morgan("dev"));
    } else {
        app.use(morgan("combined"));
    }

    app.use(GlobalErrorMiddleware.globalErrorHandler());

    return app;
}
