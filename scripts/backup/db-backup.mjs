import { config } from "dotenv";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Ciclo 17 (F1, R1): backup de la base de datos con pg_dump (formato custom -Fc,
// comprimido y restaurable con pg_restore). Sin dependencias externas: orquesta
// el CLI nativo de PostgreSQL con la configuracion del entorno del proyecto
// (DEV_* en desarrollo, DB_* en produccion, igual que env.config.ts).
//
// Uso: pnpm backup:db            (backup de la BD del NODE_ENV actual)
// Env adicionales:
//   BACKUP_DIR  - directorio de salida (default: <repo>/backups)
//   BACKUP_KEEP - numero de backups a conservar (default: 7)
//
// Restauracion (ver runbook docs/17-operacion-segura/runbook.md):
//   pg_restore --clean --if-exists -h <host> -p <port> -U <user> -d <db> <archivo.dump>

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config();

const isProd = process.env.NODE_ENV === "production";
const cfg = isProd
    ? {
          host: process.env.DB_HOST || "localhost",
          port: process.env.DB_PORT || "5432",
          user: process.env.DB_USERNAME || "postgres",
          password: process.env.DB_PASSWORD || "secret",
          database: process.env.DB || "odata_prod",
      }
    : {
          host: process.env.DEV_HOST || "localhost",
          port: process.env.DEV_PORT || "5432",
          user: process.env.DEV_USERNAME || "postgres",
          password: process.env.DEV_PASSWORD || "secret",
          database: process.env.DEV_DB || "odata_dev",
      };

const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, "..", "..", "backups"));
const keep = Number(process.env.BACKUP_KEEP) || 7;

function stamp() {
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, "0");
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function run(cmd, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, PGPASSWORD: cfg.password } });
        child.on("error", (err) => reject(new Error(`${cmd}: ${err.message}`)));
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salio con codigo ${code}`))));
    });
}

async function prune() {
    if (!fs.existsSync(backupDir)) return;
    const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith(".dump"))
        .sort()
        .reverse();
    for (const f of files.slice(keep)) {
        fs.rmSync(path.join(backupDir, f));
        console.log(`[backup] retencion: eliminado ${f}`);
    }
}

async function main() {
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `odata_${cfg.database}_${stamp()}.dump`);
    console.log(`[backup] BD: ${cfg.database} @ ${cfg.host}:${cfg.port} (${isProd ? "produccion" : "desarrollo"})`);
    console.log(`[backup] pg_dump -Fc -> ${file}`);
    await run("pg_dump", ["-Fc", "-h", cfg.host, "-p", cfg.port, "-U", cfg.user, "-d", cfg.database, "-f", file]);
    const sizeMb = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
    console.log(`[backup] OK: ${path.basename(file)} (${sizeMb} MB)`);
    await prune();
}

main().catch((err) => {
    console.error(`[backup] ERROR: ${err.message}`);
    process.exitCode = 1;
});
