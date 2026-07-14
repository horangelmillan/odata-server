import { Sequelize, Options } from "sequelize";
import { env } from "../../config/env.config.js";

const dbConfig = env.isProd ? env.prodDb : env.devDb;

const poolConfig = env.isProd
    ? { max: 20, min: 5, acquire: 30000, idle: 10000 }
    : { max: 10, min: 2, acquire: 30000, idle: 10000 };

const params: Options = {
    dialect: dbConfig.dialect,
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    logging: false,
    pool: poolConfig,
};

if (env.isProd) {
    params.dialectOptions = {
        ssl: {
            required: true,
            rejectUnauthorized: false,
        },
    };
}

const db: Sequelize = new Sequelize(params);

export { db };
export { DataTypes } from "sequelize";
