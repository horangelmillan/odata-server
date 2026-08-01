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

// F2 (ciclo 16): producción exige configuración explícita (R4). Fail-fast al
// importar: sin `SECRET_KEY` (>= 32 chars) o sin `CORS_ORIGIN` el proceso
// aborta antes de escuchar. Dev/test (modo abierto, D2) conservan defaults.
function validateProd(): { jwtSecret: string; corsOrigin: string } {
    const jwtSecret = process.env.SECRET_KEY;
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error(
            "[PROD] SECRET_KEY requerida con al menos 32 caracteres (arranque abortado)",
        );
    }
    if (!corsOrigin) {
        throw new Error("[PROD] CORS_ORIGIN requerida (arranque abortado)");
    }
    return { jwtSecret, corsOrigin };
}

const prodEnv = process.env.NODE_ENV === "production" ? validateProd() : null;

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
    jwtSecret: prodEnv?.jwtSecret ?? (process.env.SECRET_KEY || "change-me"),
    corsOrigin: prodEnv?.corsOrigin ?? process.env.CORS_ORIGIN,
    isDev: process.env.NODE_ENV !== "production",
    isProd: process.env.NODE_ENV === "production",
    devDb: loadDevDb(),
    prodDb: loadProdDb(),
    // Ciclo 17 (F3): conexi�n/BD configurables (R9, M2, R6).
    dbStatementTimeout: Number(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    dbPoolMax: Number(process.env.DB_POOL_MAX) || 10,
    dbPoolMin: Number(process.env.DB_POOL_MIN) || 2,
    dbSslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
};
