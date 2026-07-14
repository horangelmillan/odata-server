import { DataSource } from "@phrasecode/odata";
import { ProductOData } from "./models/product.odata.model.js";

export const dataSource = new DataSource({
    dialect: "postgres",
    database: process.env.NODE_ENV === "production" ? process.env.DB : process.env.DEV_DB,
    username: process.env.NODE_ENV === "production" ? process.env.DB_USERNAME : process.env.DEV_USERNAME,
    password: process.env.NODE_ENV === "production" ? process.env.DB_PASSWORD : process.env.DEV_PASSWORD,
    host: process.env.NODE_ENV === "production" ? process.env.DB_HOST : process.env.DEV_HOST,
    port: Number(process.env.NODE_ENV === "production" ? process.env.DB_PORT : process.env.DEV_PORT),
    pool: {
        max: 10,
        min: 2,
        idle: 10000,
        acquire: 30000,
    },
    models: [ProductOData],
    ssl: process.env.NODE_ENV === "production",
});
