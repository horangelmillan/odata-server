import { DataSource  } from "./odata-runtime.js";
import type { IDbConfig, DataSource as DataSourceType } from "@phrasecode/odata";
import { env } from "../../config/env.config.js";

const dbConfig = env.isProd ? env.prodDb : env.devDb;

const dataSourceConfig: Record<string, unknown> = {
    dialect: dbConfig.dialect,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port,
    // Ciclo 17 (F3): pool y timeout de sentencia configurables por entorno
    // (M2, R9). El statement_timeout se entrega via dialectOptions y el parche
    // SSL v2 (PATCHED-SSL-v2) lo preserva al fusionar dialectOptions.
    pool: {
        max: env.dbPoolMax,
        min: env.dbPoolMin,
        idle: 10000,
        acquire: 30000,
    },
    dialectOptions: {
        statement_timeout: env.dbStatementTimeout,
    },
};

// F2 (ciclo 16): SSL exigido en prod por defecto (BD gestionada); `DB_SSL=false`
// lo desactiva para despliegues locales del compose prod (BD del mismo stack)
// y para tests de modo estricto contra la BD dev.
// Ciclo 17 (F3, R6): la validacion del certificado es configurable
// (`DB_SSL_REJECT_UNAUTHORIZED`, default true); `false` solo si la BD usa
// certificados self-signed (p.ej. RDS/CloudSQL sin CA configurada).
if (env.isProd && process.env.DB_SSL !== "false") {
    dataSourceConfig.ssl = {
        require: true,
        rejectUnauthorized: env.dbSslRejectUnauthorized,
    };
}

// RF1 (ciclo 16, F1): el datasource ya NO conoce los modelos de dominio. La
// lista compuesta llega desde el bootstrap (`domainRegistrations.map(r => r.model)`),
// de modo que `common` no importa `core`.
export function createDataSource(models: unknown[]): DataSourceType {
    return new DataSource({
        ...dataSourceConfig,
        models: [...models],
    } as unknown as IDbConfig);
}

// RF1 (ciclo 16, F1): los write services del dominio son singletons sin punto
// de inyección (ver f1-modularidad.md §3.2). `expressApp(dataSource)` enlaza el
// datasource aquí al componer la app; `odataWriteService` lo consume vía
// `getDataSource()`. Trade-off aceptado: mínima modificación vs DI estricta.
let boundDataSource: DataSourceType | null = null;

export function registerDataSource(dataSource: DataSourceType): void {
    boundDataSource = dataSource;
}

export function getDataSource(): DataSourceType {
    if (!boundDataSource) {
        throw new Error(
            "DataSource not registered: call expressApp(dataSource) before using write services",
        );
    }
    return boundDataSource;
}
