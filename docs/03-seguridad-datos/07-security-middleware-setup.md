# 07 — Seguridad por entorno (ciclo 16, F2)

> Estado real tras F2 del ciclo 16 (Producción Segura). Este documento reemplaza
> la versión anterior que describía la era REST (rutas `/api` eliminadas en el
> ciclo 15 y JWT huérfano eliminado en D1 ciclo 15).

## 7.1 Modelo: modo abierto vs modo estricto (decisión D2)

| Entorno | Modo | Seguridad |
|---|---|---|
| `development` / `test` | **Abierto** | Sin auth ni rate-limit; CORS abierto; `SECRET_KEY` con default local |
| `production` | **Estricto** | Fail-fast de entorno; JWT Bearer obligatorio en `/odata` (salvo `$metadata`); CORS restringido a `CORS_ORIGIN`; rate-limit en escrituras |

La compuerta es `env.isProd` en `src/main.ts` (composition root). Dev/test no
exigen configuración de seguridad (cero fricción); producción aborta el
arranque si falta `SECRET_KEY` (≥ 32 chars) o `CORS_ORIGIN`
(`src/common/config/env.config.ts` → `validateProd()`).

## 7.2 Autenticación (dominio `src/core/auth/`)

- **Login**: `POST /auth/login` (público, JSON `{ username, password }`) →
  `{ token }` o 401. Verifica contra la tabla `users` (migración
  `004-auth-users.ts`) con `bcrypt.compare`; firma JWT con `env.jwtSecret`
  (expiración: `TOKEN_TTL_HOURS`, default 8h).
- **Protección**: `AuthMiddleware.requireBearerToken()` (kernel, common) valida
  `Authorization: Bearer <jwt>`; 401 genérico si falta/es inválido/expirado.
  Solo se monta en producción y solo sobre `/odata`; `/healthz` y
  `$metadata` son públicos (decisión DA1).
- **Usuarios**: `pnpm auth:create-user` (password desde `AUTH_PASSWORD` o
  `--password=`, nunca versionada; upsert por username) y `pnpm seed:auth`
  (admin de prueba dev: `admin` / `admin1234`, sobrescribible con
  `AUTH_DEV_PASSWORD`). `db:reset` encadena el seed de auth.

## 7.3 Helmet v8

Siempre activo (`app.use(helmet())`): CSP, HSTS, X-Content-Type-Options,
X-Frame-Options, etc. Para servir SAPUI5 desde CDN, ajustar
`contentSecurityPolicy.directives` (scriptSrc/styleSrc del CDN) — ver la
configuración de ejemplo de la versión anterior de este documento si el
despliegue lo requiere.

## 7.4 CORS v2.8 (por entorno)

```typescript
const corsOptions = { exposedHeaders: ["OData-Version"] };
if (env.isProd) {
    corsOptions.origin = (origin, callback) => callback(null, origin === env.corsOrigin);
}
app.use(cors(corsOptions));
```

- **Dev/test**: abierto (sin `origin`).
- **Prod**: forma **callback** — con un string fijo, el paquete `cors` lo
  aplicaría a cualquier origen; con callback solo el origen de `CORS_ORIGIN`
  recibe headers CORS. `OData-Version` expuesto siempre (crítico para
  clientes OData).

## 7.5 Rate-limit (solo prod, escrituras)

`express-rate-limit` (sin dependencias de runtime — IF2 resuelta) sobre
`/odata`: POST/PUT/PATCH/DELETE limitados a 100 por IP cada 15 min; lecturas y
`$metadata` sin límite. Headers `RateLimit-*` estándar.

## 7.6 `/healthz` (liveness, D6)

`GET /healthz` público: ping a la BD + uptime → 200
`{ status: "ok", db: "up", uptime }` o 503 si la BD no responde. Lo consume el
healthcheck del compose prod (F3).

## 7.7 Middleware order (estado actual en `src/main.ts`)

```typescript
app.use(helmet());                            // 1. Headers de seguridad
app.use(cors(corsOptions));                   // 2. CORS por entorno
app.get("/healthz", ...);                     // 3. Liveness público

if (env.isProd) {                             // 4. Modo estricto
    app.use("/odata", writeLimiter);          //    rate-limit escrituras
    app.use("/odata", authSkipMetadata);      //    Bearer JWT (salvo $metadata)
}

app.use("/odata", contextMiddleware, oDataExpressApp); // 5. OData
app.use(express.json());                      // 6. Body parser
app.use(compression());                       // 7. Compresión
app.use("/auth", authController);             // 8. Login (público)
morgan(...);                                  // 9. Logging por entorno
app.use(GlobalErrorMiddleware.globalErrorHandler()); // 10. Errores (último)
```

Notas de orden:

- **Limiter y auth ANTES de la cadena OData** (que reescribe `$metadata`):
  el limiter corre incluso si el request luego da 401.
- **`$metadata` se salta el auth** por decisión DA1: `req.path.includes("$metadata")`.
- **OData antes de `express.json()`**: `@phrasecode/odata` parsea su propio body.
- **Login después de `express.json()`**: necesita el body JSON.
- **Error handler siempre último.**

## 7.8 Entorno productivo (variables)

| Variable | Obligatoria en prod | Descripción |
|---|---|---|
| `SECRET_KEY` | Sí (≥ 32 chars) | Firma JWT; aborta el arranque si falta/débil |
| `CORS_ORIGIN` | Sí | Origen exacto permitido para CORS |
| `DB_SSL` | No | `"false"` desactiva SSL (compose local); default: SSL requerido |
| `TOKEN_TTL_HOURS` | No | Expiración del JWT (default 8h) |

Ver `.env.example`.
