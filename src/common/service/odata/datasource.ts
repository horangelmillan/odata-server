import { DataSource } from "@phrasecode/odata";
import type { IDbConfig } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { odataModels } from "./odata-models.js";

const dbConfig = env.isProd ? env.prodDb : env.devDb;

const dataSourceConfig: Record<string, unknown> = {
    dialect: dbConfig.dialect,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    pool: {
        max: 10,
        min: 2,
        idle: 10000,
        acquire: 30000,
    },
    // DT1 (ciclo 14): lista centralizada en odata-models.ts; el test de
    // consistencia verifica que coincide con los dominios registrados.
    models: [...odataModels],
};

if (env.isProd) {
    dataSourceConfig.ssl = { require: true, rejectUnauthorized: false };
}

export const dataSource = new DataSource(dataSourceConfig as unknown as IDbConfig);
