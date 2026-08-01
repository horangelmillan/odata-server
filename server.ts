import http from "node:http";
import { Express } from "express";
import expressApp from "./src/main.js";
import { createDataSource } from "./src/common/service/odata/datasource.js";
import { env } from "./src/common/config/env.config.js";
import { runMigrations } from "./src/common/service/odata/migrations/migrator.js";
import { domainRegistrations } from "./src/core/main.js";
import * as baselineMigration from "./src/common/service/odata/migrations/001-baseline.js";
import { financeMigrations } from "./src/core/finance/migrations/index.js";
import { AuthUserOData } from "./src/core/auth/main.js";
import { authMigrations } from "./src/core/auth/migrations/index.js";

// RF1/RF2 (ciclo 16, F1): el bootstrap compone el datasource (modelos desde
// los registros de dominio) y la lista explícita de migraciones. `001-baseline`
// es el snapshot histórico congelado. El `name` es la IDENTIDAD en
// SequelizeMeta: se conserva exactamente el nombre que registraba el resolver
// glob histórico (con extensión) para que las bases ya migradas no re-ejecuten.
// F2: el modelo de usuarios del dominio auth se añade a la composición (tabla
// sincronizada en dev; migración 004 en prod) — no es un entityset OData.
const dataSource = createDataSource([...domainRegistrations.map((r) => r.model), AuthUserOData]);

const migrations = [
    { name: "001-baseline.ts", up: baselineMigration.up, down: baselineMigration.down },
    ...financeMigrations,
    ...authMigrations,
];

const server: http.Server = http.createServer();
const app: Express = expressApp(dataSource);

const initServer = async () => {
    try {
        const sequelize = (dataSource as unknown as { sequelizerAdaptor: { sequelize: import("sequelize").Sequelize } }).sequelizerAdaptor.sequelize;

        await sequelize.authenticate()
            .then(() => console.log("database is authenticated"));

        // Phase 1: Run controlled migrations (creates/migrates tables).
        await runMigrations(sequelize, migrations);

        // Phase 2: Safety net — ensures tables exist if running from scratch
        // without the migration baseline. In dev, allows adding columns during
        // active development (sync({alter}) is the fast feedback loop).
        // In prod, sync() creates missing tables if the baseline hasn't run
        // (idempotent), but never alters existing columns.
        if (env.isDev) {
            await sequelize.sync({ alter: true });
            console.log("database synced (alter: dev)");
        } else {
            await sequelize.sync();
            console.log("database synced");
        }
    } catch (err) {
        // R3 (ciclo 17): sin `exit(1)` el proceso quedaba vivo sin escuchar
        // (exit code 0), con estado ambiguo en Docker (healthcheck + restart lo
        // mitigaban, pero sin crash real). Ahora aborta con código de error.
        console.error("FATAL: error de conexion/migraciones, el servidor no se iniciara:", err);
        process.exit(1);
    }

    server.on("request", app);
    server.listen(env.port, function () {
        console.log("Server listening on port %d", env.port);
    });
};

initServer();
