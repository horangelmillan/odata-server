# 01 — Arquitectura Propuesta: Operación Segura (ciclo 17)

> Decisiones de arquitectura del ciclo 17 (D1–D6). Referencia: `00-plan-maestro.md`.

## D1 — Single-instance como modelo objetivo

**Decisión:** el despliegue objetivo es una sola instancia del server (un contenedor
`api` + un Postgres, como el `docker-compose.prod.yml` actual). No se implementa ningún
mecanismo de escalado horizontal.

**Consecuencias aceptadas (cerradas como Descartado con nota en el backlog):**

- **R5 — rate-limit in-memory por instancia** (`express-rate-limit` en `main.ts`): el
  límite de 100 escrituras/15min/IP aplica por proceso. Con N réplicas el límite
  efectivo se multiplica. Aceptado: no hay requisito de escalado.
- **R4 — migraciones sin lock entre procesos** (`migrator.ts` corre `umzug.up()` en cada
  arranque): dos réplicas arrancando a la vez podrían competir por `SequelizeMeta`.
  Aceptado: con una sola instancia no ocurre. Si algún día se escala, el patrón será
  ejecutar las migraciones como un paso de despliegue separado (no en el arranque).

**Alternativas descartadas:** Redis/shared store para el rate-limit; cluster/PM2 en el
mismo contenedor; job de migraciones dedicado. Todas añaden infraestructura sin un
requisito real (YAGNI).

## D2 — Observabilidad: cerrada como Descartado (con nota)

**Decisión:** IF1 del ciclo 16 (métricas prom-client, APM, logging estructurado) se cierra
como **Descartado** en este ciclo. El mínimo operativo ya existe: `GET /healthz`
(liveness con ping a BD + uptime, consumido por el healthcheck del compose prod) y logs
de acceso (morgan `combined` en prod).

**Condición de reapertura:** un despliegue real con operación que requiera alertas o
análisis de tendencias. En ese momento, el primer paso documentado será añadir
`/metrics` (prom-client) y un destino Prometheus/Grafana.

**Alternativa descartada:** implementar `/metrics` hoy — sin un consumidor (Prometheus),
el endpoint no aporta valor y añade dependencia y superficie de mantenimiento (YAGNI).

## D3 — Backups/DR mínimos viables

**Decisión:** script `scripts/backup/db-backup.mjs` que ejecuta `pg_dump` (formato custom
`-Fc`) contra la BD seleccionada por entorno, con directorio de salida y retención de
copias configurable por env (`BACKUP_DIR`, `BACKUP_KEEP`). La restauración se verifica en
cada validación del ciclo (F1) restaurando en una BD limpia y comprobando datos clave.

**Por qué pg_dump:** herramienta nativa de PostgreSQL, sin dependencias nuevas, formato
`custom` comprimido y restaurable con `pg_restore`; el script solo orquesta el comando
con la configuración del entorno (reutiliza las variables `DEV_*`/`DB_*` del proyecto).

**Alternativas descartadas:** cron externo (depende del host), SaaS de backup, replicación
en caliente (streaming/standby) — fuera de escala para un proyecto personal.

## D4 — bcrypt se mantiene (mitigación documentada)

**Decisión:** no se migra la dependencia `bcrypt@5.1.1`. Los 12 avisos de `pnpm audit`
provienen de la cadena **transitiva de build/install** (`bcrypt` → `@mapbox/node-pre-gyp`
→ `tar`/`rimraf`/`minimatch`): se ejecutan solo al instalar el paquete (descarga y
desempaqueta del binario nativo) y **no corren en runtime del servidor**. La mitigación
vigente es el lockfile versionado + `--frozen-lockfile` en CI y Docker: nada fuera del
lockfile puede instalarse, y el lockfile fija la versión ya auditada.

**Documentación:** el runbook (F5) registra esta decisión, la ruta de los avisos, por qué
no son explotables en runtime y el procedimiento de actualización (re-ejecutar
`pnpm audit` tras actualizar bcrypt; revisar si una versión futura de bcrypt elimina
node-pre-gyp).

**Alternativas descartadas:** bcryptjs (JS puro) — el hash bcrypt es idéntico (`$2b$`,
mismo cost factor) y no habría mejora de seguridad del hash, solo higiene del auditor;
pero añade una dependencia nueva y cambia una pieza criptográfica sensible sin requisito;
argon2 — cambia el formato de los hashes almacenados (requiere re-hash de usuarios).

## D5 — uuid: override a `^9`

**Decisión:** `pnpm.overrides` fija `uuid@^9` (9.x) para todas las rutas transitivas
(incluida la de Sequelize). `uuid@8.3.2` tiene un advisory moderado y 0 usos directos en
`src/` (verificado); la API de uuid 9 es compatible para el uso interno de Sequelize.
Sin cambios de código; se verifica con build + suite completa.

## D6 — Versión `2.3.1`

**Decisión:** bump a `2.3.1` al cierre (patrón de releases del proyecto: se bumpea al
tocar código productivo). El ciclo modifica el arranque (`exit(1)`), la configuración de
BD (timeouts/pool/SSL), los mensajes de error y las dependencias — patch es lo correcto.

**Alternativas descartadas:** `2.4.0` (sin funcionalidad nueva para el consumidor);
sin bump (el patrón del proyecto bumpea cualquier toque al código productivo).
