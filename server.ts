import http from "node:http";
import { Express } from "express";
import expressApp from "./src/main.js";
import { db } from "./src/common/service/ORM/sequelize.service.js";

const PORT: number = Number(process.env.PORT) || 3000;
const server: http.Server = http.createServer();
const app: Express = expressApp();

const initServer = async () => {
    try {
        await db.authenticate()
            .then(() => console.log("database is authenticated"));

        await db.sync({ alter: true })
            .then(() => console.log("database is synced"));
    } catch (err) {
        return console.log(err, "something went wrong with the database connection, the server will not start.");
    }

    server.on("request", app);
    server.listen(PORT, function () {
        console.log("Server listening on port %d", PORT);
    });
};

initServer();
