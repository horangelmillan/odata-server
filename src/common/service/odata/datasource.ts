import { DataSource } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";
import { ProductOData } from "./models/product.odata.model.js";
import { CategoryOData } from "./models/category.odata.model.js";

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
    models: [ProductOData, CategoryOData],
};

if (env.isProd) {
    dataSourceConfig.ssl = { require: true, rejectUnauthorized: false };
}

export const dataSource = new DataSource(dataSourceConfig);
