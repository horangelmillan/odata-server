import { Sequelize, DataTypes, Options } from "sequelize";
import { config } from "dotenv";
config();

const paramsDev: Options = {
    dialect: "postgres",
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
    logging: false,
    pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
};

const paramsProd: Options = {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    logging: false,
    pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        ssl: {
            required: true,
            rejectUnauthorized: false,
        },
    },
};

const params = process.env.NODE_ENV === "production" ? paramsProd : paramsDev;

const db: Sequelize = new Sequelize(params);

export { db, DataTypes };
