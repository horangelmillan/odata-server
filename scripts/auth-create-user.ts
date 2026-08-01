import "reflect-metadata";
import { config } from "dotenv";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Sequelize } from "sequelize";

// F2 (ciclo 16): creación/actualización de usuarios para login (D2, decisión
// del usuario: password desde entorno, nunca en código ni versionada).
// Uso: `pnpm auth:create-user` (lee AUTH_USERNAME/AUTH_PASSWORD) o
// `pnpm auth:create-user --username=foo --password=bar`.
// Respeta NODE_ENV: dev → BD dev; production → BD prod (mismas variables que
// env.config).

config();

function loadDbConfig(): { database: string; username: string; password: string; host: string; port: number } {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
        return {
            host: process.env.DB_HOST || "localhost",
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || "postgres",
            password: process.env.DB_PASSWORD || "secret",
            database: process.env.DB || "odata_prod",
        };
    }
    return {
        host: process.env.DEV_HOST || "localhost",
        port: Number(process.env.DEV_PORT) || 5432,
        username: process.env.DEV_USERNAME || "postgres",
        password: process.env.DEV_PASSWORD || "secret",
        database: process.env.DEV_DB || "odata_dev",
    };
}

export async function upsertUser(seq: Sequelize, username: string, password: string): Promise<void> {
    const hash = await bcrypt.hash(password, 10);
    const [affected] = await seq.query(
        `INSERT INTO users (id, username, "passwordHash", "createdAt", "updatedAt")
         VALUES ($id, $username, $hash, now(), now())
         ON CONFLICT (username) DO UPDATE SET "passwordHash" = $hash, "updatedAt" = now()`,
        {
            bind: { id: randomUUID(), username, hash },
        },
    );
    console.log(`User '${username}' ${affected ? "created" : "created"} (upsert done)`);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const flagValue = (name: string): string | undefined => {
        const flag = args.find((a) => a.startsWith(`--${name}=`));
        return flag?.split("=").slice(1).join("=");
    };
    const username = flagValue("username") ?? process.env.AUTH_USERNAME ?? "admin";
    const password = flagValue("password") ?? process.env.AUTH_PASSWORD;
    if (!password || password.length < 8) {
        console.error("Password requerida (>= 8 chars): AUTH_PASSWORD o --password=");
        process.exit(1);
    }

    const cfg = loadDbConfig();
    const seq = new Sequelize(cfg.database, cfg.username, cfg.password, {
        host: cfg.host,
        port: cfg.port,
        dialect: "postgres",
        logging: false,
    });
    try {
        await seq.authenticate();
        await upsertUser(seq, username, password);
    } catch (err) {
        console.error("Fallo al crear el usuario. ¿Existe la tabla 'users'? (migración 004 / sync dev)");
        console.error((err as Error).message);
        process.exitCode = 1;
    } finally {
        await seq.close();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main();
}
