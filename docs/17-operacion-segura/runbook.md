# Runbook de Operación — odata-server

> Ciclo 17 (Operación Segura). Procedimientos operativos del servidor OData.
> Secciones: Despliegue · Secrets · Backup y Restauración · SSL · Dependencias ·
> Rollout · Troubleshooting · Escalado (notas). Rama: `feat/operacion-segura`.

---

## Despliegue (compose prod)

Prerrequisitos: Docker con Compose v2. El stack productivo es `docker-compose.prod.yml`
(imagen `target: production`: solo `dist/` + dependencias de producción; sin ts-node,
sin pgAdmin, sin montaje del código fuente).

```bash
# 1) Configurar el entorno (secrets) — ver §Secrets
#    El fail-fast de F2 aborta el arranque si SECRET_KEY/CORS_ORIGIN faltan.

# 2) Construir y levantar
docker compose -f docker-compose.prod.yml up -d --build

# 3) Verificar
docker compose -f docker-compose.prod.yml ps          # api: healthy
curl -s http://localhost:3000/healthz                 # {"status":"ok","db":"up",...}
curl -s http://localhost:3000/odata/$metadata -o /dev/null -w "%{http_code}"   # 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/odata/product-odata  # 401 (sin token)
```

Detalles del stack:

- El servicio `api` tiene healthcheck (`/healthz`, intervalo 10s, start_period 20s) y
  `restart: unless-stopped`: si `/healthz` deja de responder, Docker reinicia el contenedor.
- El servicio `db` (postgres:16-alpine) **no publica puertos** al host; su datos viven en
  el volumen `pgdata_prod` (ver §Backup: es el punto crítico de DR).
- `CORS_ORIGIN` debe ser el origen exacto del consumidor (p.ej. `https://demo.example.com`);
  cualquier otro origen recibe respuesta sin headers CORS.

---

## Secrets

| Variable | Obligatoria en prod | Regla |
|---|---|---|
| `SECRET_KEY` | Sí | ≥ 32 caracteres; firma los JWT. Sin ella el server aborta (fail-fast) |
| `CORS_ORIGIN` | Sí | Origen exacto permitido. Sin ella el server aborta (fail-fast) |
| `DB_USERNAME` / `DB_PASSWORD` / `DB` | Sí | Credenciales de la BD (el compose tiene defaults `postgres`/`secret` solo para el stack local) |
| `DB_SSL` | No | `true` (default) exige TLS a la BD; `false` para BD del mismo stack |
| `DB_STATEMENT_TIMEOUT` | No | ms; default 30000 (0 = sin límite) |
| `DB_POOL_MAX` / `DB_POOL_MIN` | No | Pool de conexiones; defaults 10/2 |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `true` (default) valida el certificado de la BD; `false` solo si la BD usa cert self-signed |

Los secrets se pasan por el entorno del host o un `.env` del proyecto (nunca versionado —
`.env` está en `.gitignore`). El compose exige `SECRET_KEY`/`CORS_ORIGIN` con `:?`:
sin ellas, `docker compose up` falla antes de arrancar.

### Rotación de `SECRET_KEY`

Cambiar la clave invalida todos los tokens JWT emitidos (los usuarios deben re-loguear;
la sesión del login es stateless, TTL 8h por defecto):

1. Generar: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
2. Actualizar `SECRET_KEY` en el entorno/.env del despliegue.
3. Reiniciar el servicio: `docker compose -f docker-compose.prod.yml up -d api`.
4. Verificar: `curl -s http://localhost:3000/healthz` (200) y un login nuevo
   (`POST /auth/login`) → token válido.

Para rotación sin downtime con dos instancias: rotar en una réplica, verificar, luego la
otra — con una sola instancia el corte es de segundos (arranque + healthcheck).

---

## Backup y Restauración de la BD

**Riesgo cubierto:** R1 (ciclo 17) — la BD es la única fuente de datos; un fallo del
host con el volumen `pgdata_prod` sin copia implica pérdida total.

### Backup (comando)

```bash
pnpm backup:db                       # backup de la BD del NODE_ENV actual
```

El script (`scripts/backup/db-backup.mjs`) usa la configuración del entorno igual que
el server (`NODE_ENV=development` → `DEV_*`/`odata_dev`; `NODE_ENV=production` →
`DB_*`). Variables opcionales:

| Variable | Descripción | Default |
|---|---|---|
| `BACKUP_DIR` | Directorio de salida | `<repo>/backups/` |
| `BACKUP_KEEP` | Número de backups a conservar (los más recientes) | `7` |

Genera `odata_<bd>_<YYYYMMDD_HHmmss>.dump` (formato custom comprimido de `pg_dump`,
restaurable con `pg_restore`) y aplica la retención.

**Automatización (decisión del operador):** el script es invocable desde cualquier
cron del host, p.ej. diario a las 03:00:

```bash
# cron: 0 3 * * *  cd <repo> && NODE_ENV=production BACKUP_KEEP=14 pnpm backup:db
```

### Restauración (verificada en el ciclo 17 F1)

```bash
# 1) Crear la BD de destino (si no existe)
PGPASSWORD=<password> createdb -h <host> -p <port> -U <user> odata_prod

# 2) Restaurar el dump sobre la BD destino (sobreescribe)
PGPASSWORD=<password> pg_restore --clean --if-exists -h <host> -p <port> -U <user> -d odata_prod <archivo.dump>
```

Verificación post-restore (mínima):

```sql
SELECT 'migrations' AS tabla, count(*) FROM "SequelizeMeta"
UNION ALL SELECT 'users', count(*) FROM users
UNION ALL SELECT 'invoices', count(*) FROM invoices;
```

Esperado: `migrations = 4` (001–004) y conteos coherentes con la fecha del backup.

### Notas

- El backup contiene el esquema **y** los datos (pg_dump full, no solo datos).
- La BD del compose prod vive en el volumen `pgdata_prod`; el backup debe copiarse a
  un medio **fuera** del host (p.ej. almacenamiento remoto) para ser un DR real.
- `pg_restore --clean --if-exists` elimina objetos existentes antes de restaurar;
  úsalo solo contra la BD que se quiere reemplazar.

---

## SSL

- **Conexión cliente → server:** TLS termina en un reverse proxy/gateway externo; el
  contenedor escucha en HTTP (puerto 3000) dentro de la red del despliegue.
- **Server → BD:** `DB_SSL=true` (default en prod) exige TLS a PostgreSQL con
  **validación del certificado** (`DB_SSL_REJECT_UNAUTHORIZED=true`, default).
  Si la BD usa certificados self-signed (p.ej. RDS/CloudSQL sin CA configurada), fija
  `DB_SSL_REJECT_UNAUTHORIZED=false` — acepta el certificado sin validar la CA.
  Con la BD del mismo stack (compose prod) usa `DB_SSL=false` (no hay TLS interno).

---

## Dependencias (audit y mitigaciones conocidas)

El CI ejecuta `pnpm audit --prod` con gate: **falla si aparece un advisory fuera de la
cadena conocida**. Estado actual (ciclo 17 F4):

- **13 advisories conocidos — cadena de build de `bcrypt@5.1.1`**
  (`@mapbox/node-pre-gyp` → `tar`/`rimraf`/`minimatch`/`brace-expansion`). Son de
  **build/install** (descarga/desempaquetado del binario nativo al instalar); **no se
  ejecutan en runtime**. Mitigación: lockfile versionado + `--frozen-lockfile` en CI y
  Docker (nada fuera del lockfile puede instalarse).
- **uuid**: resuelto con override `^11.1.1` (advisory GHSA-w5hq-g745-h8pq cubre `<11.1.1`;
  uuid 11 es ESM-only y se verificó compatible con Sequelize 6 en Node 22.20).

**Re-evaluación:** al actualizar `bcrypt` (p.ej. una versión que elimine node-pre-gyp),
re-ejecutar `pnpm audit --prod` — si la cadena desaparece, el filtro del CI queda vacío y
el gate pasa a ser 100% estricto. Nunca "arreglar" el audit con `pnpm audit --fix` sin
revisar el lockfile.

---

## Rollout (actualización de versión)

1. `git pull` en el host de despliegue (o nueva imagen si hay registry).
2. Backup previo: `NODE_ENV=production pnpm backup:db` (ver §Backup).
3. Build/actualización de la imagen: `docker compose -f docker-compose.prod.yml up -d --build api`.
4. Las migraciones se aplican al arrancar (lista explícita 001–004); el contenedor no
   pasa a healthy hasta que `/healthz` responde 200.
5. Verificar: healthz, `$metadata`, un login real, una lectura OData.
6. Si algo falla: los logs del contenedor (`docker compose -f docker-compose.prod.yml logs api`)
   muestran `FATAL` con el detalle; restaurar la versión anterior con el mismo flujo.

---

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| Contenedor `api` en reinicio (ExitCode ≠ 0) | Fallo de BD/migraciones al arrancar — el server hace `process.exit(1)` (ciclo 17 F3) | `docker compose -f docker-compose.prod.yml logs api` → línea `FATAL: error de conexion/migraciones`; revisar credenciales, BD existente, `SequelizeMeta` |
| `docker compose up` aborta | `SECRET_KEY`/`CORS_ORIGIN` ausentes (`:?` del compose) o fail-fast F2 | Definir las variables en el entorno/.env y reintentar |
| `curl /healthz` → `503` | BD caída o inalcanzable (liveness degradado) | Revisar el servicio `db` (`docker compose ps`); la BD es el único estado persistente |
| `401` en `/odata` sin token | Modo estricto (prod) — Bearer JWT obligatorio salvo `$metadata` y `/healthz` | `POST /auth/login` → `{ token }`; enviar `Authorization: Bearer <token>` |
| `401` con token válido | Token expirado (TTL 8h) o `SECRET_KEY` rotada | Re-loguear; tras rotación todos los tokens quedan inválidos (ver §Secrets) |
| `429` en escrituras | Rate-limit de prod (100/15min por IP) | Esperar la ventana; revisar si es un cliente legítimo compartiendo IP |
| `500` con mensaje genérico "Internal Server Error" | Error no tipado en prod — el detalle NO se expone al cliente (ciclo 17 F3) | Ver la consola/log del contenedor (el detalle se loguea ahí) |
| Query lenta / "canceling statement due to statement timeout" | `DB_STATEMENT_TIMEOUT` (default 30s) aborta sentencias largas | Ajustar el timeout (env) si la query es legítima; revisar índices/`$top` |
| Migraciones no aplicadas | `SequelizeMeta` con nombres históricos (`.ts`) — no re-ejecuta | Verificar `SELECT * FROM "SequelizeMeta"`; las migraciones son 001–004 |

---

## Escalado (notas — decisión D1)

El modelo objetivo es **single-instance** (una réplica `api` + un Postgres). Limitaciones
aceptadas con nota (ciclo 17 D1):

- El **rate-limit** es in-memory por instancia: con N réplicas el límite se multiplica
  por N (requeriría store compartido, p.ej. Redis).
- Las **migraciones se ejecutan en cada arranque** sin lock entre procesos: con 2+
  réplicas arrancando a la vez podría haber carrera por `SequelizeMeta`. Si algún día se
  escala, el patrón es ejecutar las migraciones como paso de despliegue separado
  (`pnpm`/job previo) y arrancar las réplicas después.

Si el proyecto llegara a producción real con operación activa, el primer paso
documentado es añadir observabilidad (métricas `/metrics` con prom-client + Prometheus),
reabriendo IF1 del ciclo 16 (cerrado como Descartado con nota en el ciclo 17 D2).
