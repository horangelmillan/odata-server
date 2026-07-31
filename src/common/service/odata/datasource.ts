import { DataSource } from "@phrasecode/odata";
import type { IDbConfig } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";

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
};

// F2 (ciclo 16): SSL exigido en prod por defecto (BD gestionada); `DB_SSL=false`
// lo desactiva para despliegues locales del compose prod (BD del mismo stack)
// y para tests de modo estricto contra la BD dev.
if (env.isProd && process.env.DB_SSL !== "false") {
    dataSourceConfig.ssl = { require: true, rejectUnauthorized: false };
}

// RF1 (ciclo 16, F1): el datasource ya NO conoce los modelos de dominio. La
// lista compuesta llega desde el bootstrap (`domainRegistrations.map(r => r.model)`),
// de modo que `common` no importa `core`.
export function createDataSource(models: unknown[]): DataSource {
    return new DataSource({
        ...dataSourceConfig,
        models: [...models],
    } as unknown as IDbConfig);
}

// RF1 (ciclo 16, F1): los write services del dominio son singletons sin punto
// de inyección (ver f1-modularidad.md §3.2). `expressApp(dataSource)` enlaza el
// datasource aquí al componer la app; `odataWriteService` lo consume vía
// `getDataSource()`. Trade-off aceptado: mínima modificación vs DI estricta.
let boundDataSource: DataSource | null = null;

export function registerDataSource(dataSource: DataSource): void {
    boundDataSource = dataSource;
}

export function getDataSource(): DataSource {
    if (!boundDataSource) {
        throw new Error(
            "DataSource not registered: call expressApp(dataSource) before using write services",
        );
    }
    return boundDataSource;
}
