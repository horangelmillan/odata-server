# F2 — Seguridad por entorno (ciclo 16)

> Fase F2 del ciclo 16 (Producción Segura). Ver `00-plan-maestro.md` (D2, D6,
> RF4) y `02-implementation-backlog.md` (R3, R4, M1, M2, M3, IF2, DA1, RF4).
> Rama: `feat/produccion-segura` · Fecha: 2026-07-31 · Estado: ✅ Cerrada

## 1. Alcance

Seguridad operativa por entorno (D2): `development`/`test` → **modo abierto**
(sin auth, cero fricción); `production` → **modo estricto** (fail-fast en
entorno, JWT Bearer obligatorio en `/odata`, CORS restringido, rate-limit en
escrituras, `/healthz`).

Confirmado por el usuario (2026-07-31):

- **DA1**: `/healthz` y `$metadata` públicos en prod; el resto de `/odata`
  exige Bearer JWT.
- **Usuario sembrado**: script `pnpm auth:create-user` (password desde entorno,
  nunca en código ni versionada); dev/test siembran su admin de prueba.

## 2. Hallazgos en alcance

| ID | Hallazgo | Clasificación | Resolución en F2 |
|---|---|---|---|
| R3 | CORS sin restricción de origen en prod | Riesgo | `origin: CORS_ORIGIN` (obligatoria en prod) |
| R4 | `SECRET_KEY` con default "change-me" sin validación | Riesgo | fail-fast prod: ≥32 chars o arranque abortado |
| M1 | Seguridad por entorno (open/strict) | Mejora | Auth middleware con tier por `env.isProd` |
| M2 | `/healthz` + healthcheck | Mejora | Endpoint liveness (ping BD + uptime); healthcheck en compose → F3 |
| M3 | Docs de seguridad de la era REST | Mejora | Reescritura de `docs/03-seguridad-datos` |
| IF2 | Rate-limit: librería vs in-memory | Investigación | **`express-rate-limit`** (sin deps de runtime, Context7 ✅) — incorporada |
| DA1 | Endpoints públicos en prod | Decisión | `/healthz` + `$metadata` públicos (confirmado) |
| RF4 | `GET /healthz` no existe (404) | Refactorización | Implementado en F2 |

## 3. Diseño

### 3.1 Entorno (`env.config.ts`)

- `validateProd()` ejecutado en producción (fail-fast al importar):
  - `SECRET_KEY` ausente o < 32 chars → `Error` y proceso abortado.
  - `CORS_ORIGIN` ausente → `Error` y proceso abortado.
- Dev/test conservan defaults (modo abierto). `jwtSecret` dev = default actual.

### 3.2 Dominio `src/core/auth/`

- `model/user.odata.model.ts` — `AuthUserOData` (`@Table("users")`): `id` (PK
  string), `username` (unique), `passwordHash`.
- `migrations/004-auth-users.ts` + `index.ts` (`authMigrations`) — crea la
  tabla `users`; `name` con extensión (identidad `SequelizeMeta`, ver F1).
- `service/auth.service.ts` — `login(username, password)`: busca en
  `sequelize.models["users"]` (mismo patrón de acceso que el write service),
  `bcrypt.compare`, firma JWT (`env.jwtSecret`, expiración configurable,
  default 8h). Error 401 genérico si credenciales inválidas.
- `controller/auth.controller.ts` — `Router` Express: `POST /auth/login`
  (JSON `{ username, password }`) → `{ token }` o 401. Público en todos los
  entornos (en dev/test no se exige usarlo).
- `main.ts` — exporta el router (el dominio auth no es un entityset OData).

### 3.3 Kernel (common)

- `middleware/auth.middleware.ts` — `AuthMiddleware.requireBearerToken()`:
  valida `Authorization: Bearer <jwt>` contra `env.jwtSecret`; 401 con detalle
  genérico si falta/es inválido/expirado.
- `middleware/healthz.middleware.ts` — `HealthzMiddleware.handler(sequelize)`:
  `GET /healthz` → ping BD + uptime; 200 `{ status: "ok", db: "up", uptime }`
  o 503 `{ status: "degraded", db: "down", uptime }`.

### 3.4 Composición (`main.ts`)

Orden (prod): `helmet()` → `cors(origin: CORS_ORIGIN)` → rate-limit de
escritura en `/odata` (POST/PUT/PATCH/DELETE, 100/15min por IP, solo prod) →
auth Bearer en `/odata` saltando `$metadata` (solo prod) → cadena OData
existente → `express.json()` → `/auth` login → `compression` → morgan →
errores. `GET /healthz` público siempre.

Dev/test: misma app SIN rate-limit ni auth (la cadena `/odata` queda intacta).

## 4. Pasos

1. `pnpm add express-rate-limit` (IF2 resuelta).
2. `env.config.ts`: `validateProd()` + `corsOrigin`.
3. Dominio auth (model, migración 004 + index, service, controller, main).
4. Middlewares de kernel (auth, healthz).
5. `main.ts`: healthz, login, CORS por entorno, rate-limit y auth en `/odata`.
6. `server.ts`: modelo `AuthUserOData` + `authMigrations` en la composición.
7. `scripts/auth-create-user.ts` (`pnpm auth:create-user`) + `scripts/seed/auth-seed.ts`
   (`pnpm seed:auth`, admin de prueba dev) + `db:reset` encadenado.
8. `.env.example`: `CORS_ORIGIN` + política de `SECRET_KEY`.
9. Tests: env-validation, auth unit (service/controller/middleware), security
   integration (dev abierto + prod estricto con BD dev apuntada).
10. Reescritura `docs/03-seguridad-datos`.
11. Gate F2 (§6) y backlog.

## 5. Checklist de ejecución

- [x] `env.config.ts`: fail-fast prod (SECRET_KEY ≥32, CORS_ORIGIN).
- [x] Dominio `src/core/auth/` completo (model, migración 004, service, controller, main).
- [x] Migración `004-auth-users.ts` registrada en `authMigrations` (server.ts).
- [x] `AuthMiddleware.requireBearerToken()`: 401 sin token / token inválido.
- [x] `HealthzMiddleware.handler()`: 200 con BD up, 503 con BD down.
- [x] `main.ts`: healthz público; CORS por entorno; rate-limit escrituras (prod);
      auth `/odata` saltando `$metadata` (prod); `/auth/login` montado.
- [x] `server.ts`: modelo User en datasource + migraciones auth.
- [x] `pnpm auth:create-user` funcional (password desde entorno, upsert).
- [x] `pnpm seed:auth` (admin dev) + `db:reset` encadenado.
- [x] `.env.example` actualizado.
- [x] Tests en verde (unit + integración dev/prod).
- [x] `docs/03` reescritas (seguridad por entorno).
- [x] Backlog actualizado (R3, R4, M1, M2, M3, IF2, DA1, RF4).

## 6. Gate de la fase

- [x] `pnpm build` (tsc --build, dist limpio) — ✅ 2026-07-31
- [x] `npx tsc --noEmit --project tsconfig.test.json` — ✅
- [x] `pnpm test` (suite completa en verde) — ✅ **215/215** (188 previos + 27 nuevos)
- [x] Smoke dev: server arranca; transacción sin token OK; migración 004 aplicada — ✅
      (migración 004 aplicada, /healthz 200, /odata 200 sin token, login → token)
- [x] Smoke prod (NODE_ENV=production):
  - sin `SECRET_KEY`/corta → arranque abortado (fail-fast) — ✅ (aborta con
    "[PROD] SECRET_KEY requerida con al menos 32 caracteres"; con .env válido
    aborta por CORS_ORIGIN)
  - sin `CORS_ORIGIN` → arranque abortado — ✅
  - con entorno completo: `/healthz` 200 sin token; `$metadata` 200 sin token;
    `/odata` sin token → 401; login → token → 200 — ✅ (smoke real sobre BD dev)

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R3 | CORS sin restricción de origen en prod | Riesgo | Resuelto: callback `origin === CORS_ORIGIN` (un string fijo no restringe en el paquete `cors`) |
| R4 | `SECRET_KEY` con default "change-me" sin validación | Riesgo | Resuelto: `validateProd()` fail-fast (≥32 chars) + `CORS_ORIGIN` obligatoria |
| M1 | Seguridad por entorno (open/strict) | Mejora | Resuelto: auth+rate-limit+CORS solo en prod; dev/test intactos |
| M2 | `/healthz` + healthcheck | Mejora | Parcial: endpoint F2 ✅; wiring del healthcheck en compose → F3 |
| M3 | Docs de seguridad de la era REST | Mejora | Resuelto: `docs/03-seguridad-datos/07-…` reescrito (por entorno) |
| IF2 | Rate-limit: librería vs in-memory | Investigación | Resuelto: `express-rate-limit` (0 deps de runtime; Context7) — incorporada |
| DA1 | Endpoints públicos en prod | Decisión | Confirmada por el usuario: `/healthz` + `$metadata` públicos; resto Bearer |
| RF4 | `GET /healthz` no existe (404) | Refactorización | Resuelto: `HealthzMiddleware` montado en el bootstrap |
| — | `node dist/server.js` sigue roto (R1) | Riesgo | F3 (parche dir-imports); no es alcance de F2 — gate F2 validado vía loader ts-node |

## 8. Resultado

F2 ejecutada y cerrada el 2026-07-31.

- **Seguridad por entorno (D2) operativa:** dev/test → modo abierto sin tocar
  la cadena OData; prod → fail-fast de entorno, Bearer JWT en `/odata`
  (salvo `$metadata`), CORS restringido por callback, rate-limit de escrituras
  (100/15min/IP), `/healthz` público. Verificado por smoke real en ambos modos.
- **Dominio `src/core/auth/`:** modelo `AuthUserOData` (tabla `users`, migración
  `004-auth-users.ts`), `authService.login` (bcrypt + JWT, TTL 8h default),
  `POST /auth/login` público. Usuarios vía `pnpm auth:create-user`
  (password desde entorno) y `pnpm seed:auth` (admin dev; `db:reset` encadena).
- **Kernel:** `AuthMiddleware.requireBearerToken()` y
  `HealthzMiddleware.handler()` (resolver perezoso — los test doubles de
  DataSource no exponen sequelize).
- **Ajustes de infraestructura:** `DB_SSL=false` desactiva SSL en prod
  (compose local / tests); CORS por callback (string fijo no restringe).
- **Datos:** `express-rate-limit` añadida (IF2); `.env.example` con `CORS_ORIGIN`
  y política de `SECRET_KEY`; `docs/03` reescritas (M3).
- **Gate:** build ✅ · tsc ✅ · **215/215** ✅ · smoke dev ✅ · smoke prod ✅
  (fail-fast ×3, healthz/metadata públicos, 401 sin token, login→200).
- **Pendiente conocido:** `pnpm start` (dist) sigue roto por R1 → F3.
- **Siguiente fase:** F3 (arranque productivo: parche dir-imports, smoke
  `pnpm start` en CI, Docker real con BD limpia, healthcheck compose).
