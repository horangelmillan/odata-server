import "reflect-metadata";
import { config } from "dotenv";
import { Sequelize } from "sequelize";
import { upsertUser } from "../auth-create-user.js";

// F2 (ciclo 16): usuario admin de prueba para desarrollo/test (modo abierto no
// lo exige, pero permite probar login y el modo estricto contra la BD dev).
// Password dev por defecto, sobrescribible con AUTH_DEV_PASSWORD.
config();

const devCfg = {
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
};

async function main(): Promise<void> {
    const seq = new Sequelize(devCfg.database, devCfg.username, devCfg.password, {
        host: devCfg.host,
        port: devCfg.port,
        dialect: "postgres",
        logging: false,
    });
    try {
        await seq.authenticate();
        await upsertUser(seq, process.env.AUTH_DEV_USERNAME || "admin", process.env.AUTH_DEV_PASSWORD || "admin1234");
    } catch (err) {
        console.error((err as Error).message);
        process.exitCode = 1;
    } finally {
        await seq.close();
    }
}

void main();
