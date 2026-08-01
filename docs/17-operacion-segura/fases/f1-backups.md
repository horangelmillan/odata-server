# F1 — Backups/DR de la BD (R1, D3)

> Fase 1 del ciclo 17 — "Operación Segura". Rama `feat/operacion-segura`.
> Alcance: script de backup con pg_dump + retención, restauración verificada
> y procedimiento documentado.

## 1. Objetivo

Cerrar R1 (riesgo **Alto**: sin backups/DR — `pgdata_prod` es un volumen local sin
protección). Entregable: `pnpm backup:db` genera una copia restaurable de la BD; el
procedimiento de restauración queda documentado y **verificado** en este ciclo.

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `scripts/backup/db-backup.mjs` | NUEVO: orquesta `pg_dump -Fc` con la configuración del entorno (`DEV_*`/`DB_*`, igual que `env.config.ts`); retención `BACKUP_KEEP` (default 7); salida `BACKUP_DIR` (default `backups/`); password vía `PGPASSWORD` (nunca en argv) |
| `package.json` | script `pnpm backup:db` |
| `.gitignore` | `backups/` |
| `docs/17-operacion-segura/runbook.md` | §Backup y Restauración (procedimiento completo) |
| `docs/17-operacion-segura/fases/f1-backups.md` | este documento |
| Backlog | R1 → Implementado (F1) |

Fuera de alcance: cron externo, SaaS, replicación en caliente (D3 — decisión: mínimos
viables; el operador ejecuta el backup manualmente o con su cron del host).

## 3. Diseño

- **Formato `-Fc`** (custom comprimido): restaurable con `pg_restore`, permite
  `--clean --if-exists` para sobreescribir.
- **Entorno**: usa `NODE_ENV` igual que el server — `dev` → `odata_dev` (DEV_*),
  `production` → `DB_*`. Mismo criterio que `env.config.ts`.
- **Retención**: por defecto conserva los 7 backups más recientes (ordenados por
  nombre con timestamp `YYYYMMDD_HHmmss`); `BACKUP_KEEP=1` deja solo el último.
- **Sin dependencias**: solo `node:child_process` + `dotenv` (ya en el proyecto).

## 4. Pasos

1. `scripts/backup/db-backup.mjs` (ESM, sin anotaciones TS — es `.mjs`).
2. `package.json`: `"backup:db": "node scripts/backup/db-backup.mjs"`.
3. `.gitignore`: `backups/`.
4. **Gate F1 — verificación real:**
   a. `pnpm backup:db` → dump generado.
   b. `CREATE DATABASE odata_restore_test` + `pg_restore --clean --if-exists` → exit 0.
   c. Conteos verificados tras restaurar: users (hash bcrypt 60 chars), invoices,
      products, `SequelizeMeta` = 4 (migraciones 001–004).
   d. Retención: `BACKUP_KEEP=1` ×2 → solo queda el último dump.
   e. Drop de la BD de prueba.
5. Runbook: sección Backup y Restauración.
6. Cierre: checklist, gate, hallazgos, resultado; backlog R1 → Implementado.

## 5. Checklist de ejecución

- [x] `pnpm backup:db` genera el dump (formato custom, con timestamp).
- [x] La BD destino del backup depende de `NODE_ENV` (DEV_* / DB_*).
- [x] `BACKUP_DIR` y `BACKUP_KEEP` funcionan (retención verificada con KEEP=1).
- [x] Restauración verificada: pg_restore exit 0 en BD limpia + datos íntegros.
- [x] `backups/` ignorado por git; `package.json` con el script.
- [x] Runbook con §Backup y Restauración.
- [x] Backlog actualizado (R1 → Implementado).

## 6. Gate de la fase

- [x] Backup generado ✅ (2026-08-01, `odata_odata_dev_20260801_153825.dump`, 22 KB)
- [x] Restauración en BD limpia ✅ (exit 0; users=2 con hash bcrypt 60, invoices=1,
      products=5, SequelizeMeta=4 — estado exacto de la BD origen)
- [x] Retención ✅ (KEEP=1: el segundo backup eliminó el primero)
- [x] Suite/build intactos ✅ (no se tocó código del server; package.json solo añade script)

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R1 | Sin backups/DR de la BD | Riesgo (Alto) | Resuelto en esta fase: `pnpm backup:db` + restore verificado + runbook §backup |
| — | Al redactar el script se incluyó sintaxis TypeScript en un `.mjs` (anotación `: string`) — Node la rechaza | Nota | Corregido en la misma fase (JS puro en `.mjs`; solo los `.ts` llevan tipos) |

## 8. Resultado

F1 ejecutada y cerrada el 2026-08-01.

- **`pnpm backup:db` operativo:** pg_dump `-Fc` con la config del entorno, retención
  configurable (`BACKUP_KEEP`, default 7) y salida en `backups/` (ignorada por git).
- **Restauración verificada de verdad:** dump → BD limpia `odata_restore_test` →
  `pg_restore --clean --if-exists` exit 0 → datos íntegros (usuarios con hash bcrypt
  válido, migraciones 001–004, productos). Procedimiento documentado en el runbook.
- **Gate:** backup ✅ · restore ✅ · retención ✅.
- **Pendiente conocido:** ninguno. La automatización por cron queda a decisión del
  operador (D3 — el script es invocable desde cualquier cron del host).
- **Siguiente fase:** F2 (CI: build de imagen Docker + gate `pnpm audit` + `exit(1)`
  en `initServer`).
