import { config } from "dotenv";

config();

export interface DbConnectionConfig {
    dialect: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

function loadDevDb(): DbConnectionConfig {
    return {
        dialect: "postgres",
        host: process.env.DEV_HOST || "localhost",
        port: Number(process.env.DEV_PORT) || 5432,
        username: process.env.DEV_USERNAME || "postgres",
        password: process.env.DEV_PASSWORD || "secret",
        database: process.env.DEV_DB || "odata_dev",
    };
}

function loadProdDb(): DbConnectionConfig {
    return {
        dialect: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "secret",
        database: process.env.DB || "odata_prod",
    };
}

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 3000,
    jwtSecret: process.env.SECRET_KEY || "change-me",
    isDev: process.env.NODE_ENV !== "production",
    isProd: process.env.NODE_ENV === "production",
    devDb: loadDevDb(),
    prodDb: loadProdDb(),
};
