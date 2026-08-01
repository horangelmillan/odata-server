# 02 — Implementation Backlog: Ciclo 17 — Operación Segura

> Única fuente de verdad de hallazgos del ciclo 17. Categorías según AGENTS.md:
> Riesgo (`R`), Mejora (`M`), Refactorización (`RF`), Deuda Técnica (`DT`),
> Investigación Futura (`IF`), Decisión Arquitectónica (`DA`).
> Estados válidos: Pendiente · En evaluación · Implementado · Descartado ·
> Movido a iniciativa futura · Superseded.

---

## Hallazgos iniciales (evaluación de madurez 2026-08-01)

| ID | Categoría | Hallazgo | Detalle / evidencia | Impacto | Estado | Resolución |
|---|---|---|---|---|---|---|
| R1 | Riesgo | **Sin backups/DR de la BD** | `pgdata_prod` es volumen local de Docker (`docker-compose.prod.yml`); no existe script de dump, retención ni procedimiento de restauración. Fallo del host = pérdida total de datos | **Alta** | Implementado | F1 (`pnpm backup:db`: pg_dump -Fc + retención BACKUP_KEEP; restore verificado en BD limpia; runbook §backup) |
| R2 | Riesgo | **CI no construye la imagen Docker** | `.github/workflows/ci.yml` (job `test`): build → tsc → tests → smoke dist. El gate Docker del ciclo 16 (F3) fue manual; una rotura futura del Dockerfile o del stage production no se detecta en el pipeline | Media | Pendiente | F2 (job de build de imagen) |
| R3 | Riesgo | **`initServer` no aborta con `exit(1)`** | `server.ts`: el catch de authenticate/migraciones/sync loguea y retorna sin `server.listen` → proceso vivo sin escuchar, exit code 0. En Docker lo mitiga healthcheck + `restart: unless-stopped`, pero el estado es ambiguo (contador de restarts, sin crash real) | Media | Pendiente | F2 (`process.exit(1)` con mensaje claro) |
| R4 | Riesgo | **Migraciones sin lock entre procesos** | `migrator.ts` ejecuta `umzug.up()` en cada arranque; 2+ réplicas simultáneas compiten por `SequelizeMeta` (una puede fallar con tabla/columna existente). Solo relevante al escalar | Baja | Pendiente | Descartado vía D1 (single-instance; nota en runbook para escalado futuro) |
| R5 | Riesgo | **Rate-limit in-memory por instancia** | `main.ts` usa `express-rate-limit` sin store compartido; con N réplicas el límite 100/15min/IP se multiplica por N. Solo relevante al escalar | Baja | Pendiente | Descartado vía D1 (single-instance; nota en runbook) |
| R6 | Riesgo | **SSL de BD sin validación de CA** | `datasource.ts`: `ssl: { require: true, rejectUnauthorized: false }` en prod — acepta cualquier certificado (útil con RDS/CloudSQL self-signed, pero sin validación por defecto) | Media | Pendiente | F3 (`DB_SSL_REJECT_UNAUTHORIZED`, default true; `false` solo si el despliegue lo exige) |
| R7 | Riesgo | **`error.message` expuesto en 500 genéricos** | `global-error.middleware.ts` fallback: `message: error.message` al cliente (no stack, pero puede filtrar detalles de infraestructura/BD) | Media | Pendiente | F3 (mensaje genérico en prod; detalle solo en consola/log) |
| R8 | Riesgo | **`uuid@8.3.2` moderada transitiva** | `pnpm audit --prod`: 1 moderada vía `sequelize@6.37.8 > uuid@8.3.2`; **0 usos directos en `src/`** (grep verificado); advisory GHSA (ReDoS en parseo) | Baja | Pendiente | F4 (override `uuid@^9` vía `pnpm.overrides`) |
| R9 | Riesgo | **Sin `statement_timeout`** | Ningún timeout de sentencia configurado; una query pesada retiene una conexión del pool (max 10) indefinidamente y degrada el resto | Baja | Pendiente | F3 (`DB_STATEMENT_TIMEOUT` env, default prudente) |
| M1 | Mejora | **`coverage/` no ignorado** | `pnpm test:coverage` genera `coverage/` que aparece como untracked en git (`.gitignore` no lo cubre) | Trivial | Pendiente | F0 (añadir a `.gitignore` + limpiar artefacto) |
| M2 | Mejora | **Pool de BD fijo** | `datasource.ts`: `pool: { max: 10, min: 2, idle: 10000, acquire: 30000 }` sin configuración por entorno | Baja | Pendiente | F3 (`DB_POOL_MAX`/`DB_POOL_MIN` env con defaults actuales) |
| M3 | Mejora | **Sin `pnpm audit` en CI** | Ningún gate de vulnerabilidades en el pipeline; nuevas CVEs pasarían desapercibidas | Baja | Pendiente | F2 (paso `pnpm audit --prod` con fail si critical) |
| M4 | Mejora | **Sin runbook de operación** | No existe documentación de despliegue (compose prod), secrets, SSL, backups, rollout ni troubleshooting | Media | Pendiente | F5 (runbook.md) |
| DT1 | Deuda Técnica | **bcrypt → node-pre-gyp → tar (12 avisos)** | `pnpm audit`: 12 avisos (1 critical, 8 high, 3 moderate) en la cadena transitiva de **build/install** de `bcrypt@5.1.1` (`@mapbox/node-pre-gyp` → `tar`/`rimraf`/`minimatch`/`brace-expansion`). No se ejecuta en runtime (el server usa el binario compilado); mitigado por `--frozen-lockfile` + lockfile versionado | Baja | Pendiente | Descartado vía D4 (mitigación documentada en runbook; re-evaluar al actualizar bcrypt) |
| DT2 | Deuda Técnica | **SECRET_KEY estática con rotación manual** | JWT con TTL 8h sin refresh; la rotación de la clave no está documentada (cambiar la clave invalida todos los tokens) | Baja | Pendiente | F5 (procedimiento de rotación en runbook) |
| IF1 | Investigación | **Observabilidad externa** | Reabierto desde ciclo 16 ("Movido a iniciativa futura"): métricas (prom-client), APM, logging estructurado con transporte — sin operación real que lo requiera | Baja | En evaluación | Descartado vía D2 (YAGNI; nota de reapertura en runbook) |
| DA1 | Decisión | **Modelo single-instance** | El despliegue objetivo es una instancia; R4/R5 aceptados con nota (ver `01-arquitectura-propuesta.md` D1) | — | Pendiente | D1 (registrada en F0) |
| DA2 | Decisión | **Observabilidad: cerrar IF1** | Sin consumidor de métricas no aporta valor; se reabre con despliegue real | — | Pendiente | D2 (registrada en F0) |
| DA3 | Decisión | **Estrategia de backup** | pg_dump + retención + restore verificado; sin cron externo ni SaaS | — | Pendiente | D3 (registrada en F0) |
| DA4 | Decisión | **bcrypt: mantener + documentar** | Sin mejora de seguridad real en el hash; mitigación build-time documentada | — | Pendiente | D4 (registrada en F0) |
| DA5 | Decisión | **uuid: override a ^9** | Limpia la única moderada de runtime sin cambio de código | — | Pendiente | D5 (registrada en F0) |
| DA6 | Decisión | **Bump 2.3.1** | Patch: el ciclo toca código productivo | — | Pendiente | D6 (registrada en F0) |

---

## Bitácora

| Fecha | ID | Acción |
|---|---|---|
| 2026-08-01 | — | Ciclo creado (F0): rama `feat/operacion-segura`, plan maestro (D1–D6), arquitectura propuesta, este backlog, índice §17, `.gitignore` (coverage/), IF1 del backlog 16 cerrado como Descartado (ref. D2) |
| 2026-08-01 | R1 | F1 ejecutada: `pnpm backup:db` (pg_dump -Fc, `DEV_*`/`DB_*` por NODE_ENV, `BACKUP_DIR`/`BACKUP_KEEP`), `backups/` ignorado, runbook §backup. Gate: dump 22 KB generado, **restore verificado** en BD limpia (exit 0; users con hash bcrypt válido, SequelizeMeta=4), retención verificada (KEEP=1). R1 → Implementado |
