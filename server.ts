import http from "node:http";
import { Express } from "express";
import expressApp from "./src/main.js";
import { dataSource } from "./src/common/service/odata/datasource.js";
import { env } from "./src/common/config/env.config.js";

const server: http.Server = http.createServer();
const app: Express = expressApp();

const initServer = async () => {
    try {
        const sequelize = (dataSource as unknown as { sequelizerAdaptor: { sequelize: { authenticate: () => Promise<void>; sync: (opts: { alter: boolean }) => Promise<void> } } }).sequelizerAdaptor.sequelize;

        await sequelize.authenticate()
            .then(() => console.log("database is authenticated"));

        await sequelize.sync({ alter: true })
            .then(() => console.log("database is synced"));
    } catch (err) {
        return console.log(err, "something went wrong with the database connection, the server will not start.");
    }

    server.on("request", app);
    server.listen(env.port, function () {
        console.log("Server listening on port %d", env.port);
    });
};

initServer();
