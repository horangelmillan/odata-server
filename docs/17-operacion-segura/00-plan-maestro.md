# 00 — Plan Maestro: Operación Segura (ciclo 17)

> **Ciclo:** `17-operacion-segura`
> **Inicio:** 2026-08-01
> **Estado global:** ✅ F0–F6 completadas — merge a `master` vía PR #34 (tag `v2.3.1`)
> **Baseline (verificado 2026-08-01):** `pnpm build` ✅ · `pnpm test` **215/215** ✅ · type-check tests 0 ✅ · working tree limpio · master al día (69df066) · sin issues/PRs abiertos

---

## 0. Contexto y origen

Tras el cierre del ciclo 16 (Producción Segura, PR #32, tag `v2.3.0`), se ejecutó una
**evaluación exhaustiva de madurez productiva** (2026-08-01): suite, CI, Docker,
arquitectura, seguridad, dependencias, integración UI5 y backlogs. Veredicto: el
proyecto está **listo para un despliegue productivo controlado** — no hay errores
bloqueantes y los 16 ciclos están cerrados sin pendientes. Sin embargo, la evaluación
detectó limitaciones **operativas** reales (ninguna bloqueante para arrancar, todas
relevantes para operar con confianza o ante fallos del host):

1. **Sin backups/DR de la BD (crítico):** `pgdata_prod` es un volumen local de Docker;
   no hay script de dump, retención ni procedimiento de restauración. Fallo del host =
   pérdida total de datos.
2. **CI sin build de la imagen Docker:** el gate Docker del ciclo 16 (F3) fue manual;
   una rotura futura del Dockerfile/build prod pasa desapercibida en el pipeline.
3. **`initServer` no aborta con `exit(1)`:** si migraciones/BD fallan, el proceso queda
   vivo sin escuchar (exit 0); en Docker lo mitiga el healthcheck + `restart`, pero el
   estado reportado es engañoso.
4. **Conexión/BD sin hardening:** `statement_timeout` ausente (una query pesada retiene
   conexiones del pool max 10), pool fijo no configurable, SSL de BD con
   `rejectUnauthorized: false` (certificados no validados), `error.message` expuesto en
   los 500 genéricos.
5. **Higiene de dependencias:** `uuid@8.3.2` moderada transitiva de Sequelize (0 usos en
   `src/`); 12 avisos de la cadena de build de bcrypt (tar/node-pre-gyp — build-time, no
   runtime) que ensucian `pnpm audit` y conviene documentar como mitigación conocida.
6. **Sin runbook de operación:** despliegue, secrets, SSL, backups, rollout y
   troubleshooting no están documentados como procedimiento.

Además, el usuario confirmó que el proyecto es **personal** y probablemente nunca pase a
producción real. El ciclo es, por tanto, un ejercicio de ingeniería de "operación segura"
con **criterio YAGNI**: los temas de escalado horizontal se cierran como decisiones
documentadas (no se implementa lo que no hay requisito real de usar).

---

## 1. Decisiones de arquitectura

| D | Decisión | Alternativas descartadas |
|---|---|---|
| **D1** | **Single-instance es el modelo objetivo** (proyecto personal): la limitación del rate-limit in-memory por instancia (R5) y las migraciones sin lock entre procesos (R4) se cierran como **Descartado con nota** — no hay requisito de escalado horizontal | Redis/shared store para rate-limit, cluster/PM2, job de migraciones separado — infraestructura sin requisito real (YAGNI) |
| **D2** | **Observabilidad externa cerrada como Descartado** (IF1 del ciclo 16): `/healthz` + morgan `combined` cubren el mínimo operativo; métricas (prom-client), APM y logs estructurados se reabrirán **solo** con un despliegue real que las justifique | Implementar `/metrics` con prom-client — sin un Prometheus/Grafana consumiendo, el endpoint no aporta valor hoy (YAGNI) |
| **D3** | **Backups/DR mínimos viables**: script `scripts/backup/` (pg_dump + retención configurable) + **restauración verificada** en BD de prueba + procedimiento en runbook | Cron externo, herramientas SaaS de backup, replicación en caliente — fuera de escala para el contexto |
| **D4** | **bcrypt se mantiene** (nativo, más rápido): los 12 avisos de `tar`/`node-pre-gyp` son de la cadena de **build/install** (no se ejecutan en runtime) y están mitigados por `--frozen-lockfile` + lockfile versionado; se documentan como riesgo conocido en el runbook | Migrar a bcryptjs (JS puro) — eliminaría el ruido de audit pero no hay mejora de seguridad real del hash; mantener el mínimo movimiento; argon2 — cambio de formato de hashes |
| **D5** | **`uuid` → override a `^9`** vía `pnpm.overrides`: elimina la única moderada de runtime (transitiva de Sequelize, 0 usos directos) sin cambio de código | Dejar la vulnerabilidad inerte — se limpia con un override de bajo riesgo |
| **D6** | **Bump `2.3.1`** al cierre (patch): el ciclo toca código productivo (exit(1), timeouts de BD, SSL, mensajes de error, deps) | `2.4.0` — sin funcionalidad nueva; sin bump — el patrón de releases del proyecto bumpea al tocar código |

---

## 2. Fases

| Fase | Contenido | Entregable | Criterio de aceptación |
|---|---|---|---|
| F0 | Rama `feat/operacion-segura` + plan/backlog/índice §17 + `.gitignore` (`coverage/`) + IF1 backlog 16 → Descartado (D2) | Este ciclo creado | Build + 215/215 + type-check ✅ |
| F1 | **Backups (D3)**: `scripts/backup/db-backup.mjs` (pg_dump + retención por entorno) + verificación de **restauración** en BD limpia + §backup del runbook | Backup y restore operativos | Backup generado y restaurado en BD limpia con datos verificados |
| F2 | **CI y arranque (R2, R3, M3)**: job de build de la imagen Docker en CI + paso `pnpm audit` (fail si critical) + `initServer` con `process.exit(1)` ante fallo de BD/migraciones | Pipeline robusto | CI verde con los 3 pasos nuevos |
| F3 | **Conexión/BD (R6, R7, R9, M2)**: `statement_timeout` configurable (env), pool configurable (env), SSL con `DB_SSL_REJECT_UNAUTHORIZED` (default true), mensaje 500 genérico en prod (detalle solo en log) | Conexión hardening | Suite + smoke dist prod ✅ |
| F4 | **Dependencias (R8, D4, D5)**: `pnpm.overrides` → `uuid@^9`; audit final sin critical (12 avisos de bcrypt documentados como conocidos) | Audit saneado | Build + suite + `pnpm audit` sin critical ✅ |
| F5 | **Runbook** `docs/17-operacion-segura/runbook.md`: despliegue compose prod, secrets (SECRET_KEY/CORS_ORIGIN/DB_*), SSL/DB_SSL, backups+restore, mitigación bcrypt (D4), rollout, troubleshooting, rotación de SECRET_KEY | Operación documentada | Procedimiento completo y consistente con el código |
| F6 | **Validación integral + cierre (D6)**: build, type-check, suite, smoke dist dev/prod, compose prod (si Docker disponible), regresión Playwright bench 8/8, bump `2.3.1`, revisión completa del backlog, PR a `master` con CI verde | PR mergeado + tag `v2.3.1` | Todo en verde; backlog sin "Pendiente"/"En evaluación" |

---

## 3. Criterios de aceptación globales

- [x] Backup de BD generable y **restaurable** siguiendo el procedimiento documentado.
- [x] CI construye la imagen Docker prod y falla el pipeline si `pnpm audit` detecta critical.
- [x] `initServer` aborta con exit code ≠ 0 si la BD/migraciones fallan.
- [x] `statement_timeout` y pool configurables por entorno; SSL de BD validable por CA.
- [x] Los 500 genéricos no exponen detalles de implementación en prod.
- [x] `pnpm audit --prod` sin vulnerabilidades critical; las moderadas restantes documentadas con su mitigación.
- [x] Runbook de operación completo (despliegue, secrets, SSL, backups, rollout, troubleshooting).
- [x] Backlog 17 sin elementos "Pendiente"/"En evaluación" al cierre.
- [x] `docs/00-indice.md` refleja el ciclo 17; versión `2.3.1` (D6).
- [x] R4/R5 (escalado) e IF1 (observabilidad) cerrados como Descartado con nota y trazabilidad.

---

## 4. Flujo Git

- Rama: `feat/operacion-segura` (nueva, desde `master` actualizado — GIT_WORKFLOW §2).
- Fases F1–F6 sobre la misma rama mientras el PR esté abierto (GIT_WORKFLOW §12).
- Único mecanismo de integración: PR a `master` con CI verde (GIT_WORKFLOW §7–§8).
- Sin cambios en `ui5-odata-demo` (repo externo, no forma parte de este ciclo).

---

## 5. Resultado de la ejecución

*(Completado al cierre, fase por fase, con evidencia.)*

- **F0** ✅ (2026-08-01): rama `feat/operacion-segura`, plan (D1–D6), arquitectura
  propuesta, backlog (R1–R9, M1–M4, DT1–DT2, IF1, DA1–DA6), índice §17, `.gitignore`
  (coverage/), IF1 backlog 16 → Descartado (ref. D2). Gate: build + 215/215 + type-check.
- **F1** ✅: `pnpm backup:db` (pg_dump `-Fc` + retención `BACKUP_KEEP`) + **restore
  verificado** en BD limpia (exit 0, datos íntegros) + runbook §backup (R1).
- **F2** ✅: `initServer` → `process.exit(1)` (verificado: BD inexistente → exit 1)
  (R3); CI: job `docker-build` (imagen prod) (R2) + gate "Audit de dependencias" con
  allowlist documentada (M3).
- **F3** ✅: `DB_STATEMENT_TIMEOUT` (30s, verificado en pg), pool por env
  (`DB_POOL_MAX`/`MIN`), `DB_SSL_REJECT_UNAUTHORIZED` (default true), parche SSL v2
  (`PATCHED-SSL-v2`, merge de dialectOptions, idempotente), 500 genérico en prod
  (detalle a consola). Smoke dev/prod ✅.
- **F4** ✅: override `uuid@^11.1.1` (advisory `<11.1.1`; ESM-only verificado con
  Sequelize 6 en Node 22.20). Audit: 14 → **13 advisories, todos de la cadena de build
  de bcrypt** (DT1 → Descartado D4; filtro CI simplificado).
- **F5** ✅: runbook completo (despliegue, secrets+rotación, backup/restore, SSL,
  dependencias, rollout, troubleshooting, escalado) (M4, DT2).
- **F6** ✅: validación integral (build + tsc + **215/215** + smoke dist dev/prod +
  audit) + bump **2.3.1** (D6) + cierre (R4/R5/IF1 → Descartado con nota; DA1–DA6 →
  Implementado; backlog sin pendientes) + PR a `master` con CI verde + tag `v2.3.1`.
