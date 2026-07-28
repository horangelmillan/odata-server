import http from "node:http";
import { Express } from "express";
import expressApp from "./src/main.js";
import { dataSource } from "./src/common/service/odata/datasource.js";
import { env } from "./src/common/config/env.config.js";
import { runMigrations } from "./src/common/service/odata/migrations/migrator.js";

const server: http.Server = http.createServer();
const app: Express = expressApp();

const initServer = async () => {
    try {
        const sequelize = (dataSource as unknown as { sequelizerAdaptor: { sequelize: import("sequelize").Sequelize } }).sequelizerAdaptor.sequelize;

        await sequelize.authenticate()
            .then(() => console.log("database is authenticated"));

        // Phase 1: Run controlled migrations (creates/migrates tables).
        await runMigrations(sequelize);

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
        return console.log(err, "something went wrong with the database connection, the server will not start.");
    }

    server.on("request", app);
    server.listen(env.port, function () {
        console.log("Server listening on port %d", env.port);
    });
};

initServer();
