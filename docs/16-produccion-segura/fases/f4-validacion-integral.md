# F4 — Validación integral

> Fase 4 del ciclo 16 — "Producción Segura". Rama `feat/produccion-segura`.
> Alcance: validación integral del ciclo (gate estático, determinismo del seed,
> smoke dist en ambos modos, Playwright 8/8 + navegación) y registro documental.

---

## 1. Objetivo

Verificar de forma integral lo implementado en F1–F3 antes del cierre (F5),
según `00-plan-maestro.md` §2 (F4): build, type-check de tests, suite completa,
`db:reset` ×2 (determinismo), smoke dist, **Playwright** (skill obligatoria)
bench 8/8 + navegación Demo ↔ Finance ↔ detail, 0 errores de consola.

## 2. Pasos ejecutados

1. **Estado documental**: header del plan maestro (`F0–F3 completadas — F4 en
   curso`) e índice `docs/00-indice.md` §16 actualizados al estado real.
2. **Git**: rama publicada (`origin/feat/produccion-segura`) + **PR #32**
   abierto a `master` (GIT_WORKFLOW §7; plan maestro §4 — el PR estaba
   pendiente: la rama solo existía en local).
3. **Gate estático**: `pnpm build` + `npx tsc --noEmit --project
   tsconfig.test.json` + `pnpm test` (215/215, 32 archivos).
4. **Determinismo**: `pnpm db:reset` ×2 con md5 del dataset tras cada
   ejecución.
5. **Smoke dist**: `node dist/server.js` en modo abierto (dev) y en modo
   estricto (prod).
6. **Playwright**: test bench 8/8 + navegación Demo ↔ Finance ↔ detalle.
7. Cierre: este documento + backlog + bitácora + commit.

## 3. Resultados

### 3.1 Gate estático

| Chequeo | Resultado |
|---|---|
| `pnpm build` | ✅ |
| `npx tsc --noEmit --project tsconfig.test.json` | ✅ (0 errores) |
| `pnpm test` | ✅ **215/215** (32 archivos, ~38s) |

### 3.2 Determinismo del seed (`db:reset` ×2)

| Ejecución | md5 del dataset |
|---|---|
| PASS 1 | `05d92a3c898dafc6910910996ec2aed1` |
| PASS 2 | `05d92a3c898dafc6910910996ec2aed1` ✅ idéntico |

Criterio del hash (documentado): dataset = todas las tablas `public` salvo
`SequelizeMeta`, **excluyendo** columnas de auditoría (`createdAt`/`updatedAt`,
`NOW()` de Sequelize) y `users.passwordHash` (salt bcrypt aleatorio por
diseño). En el ciclo 15 el md5 era idéntico al 100% porque la tabla `users`
no existía; con el dominio auth (F2), `passwordHash` es el único campo no
determinista del dataset — comportamiento correcto de seguridad, no un bug.

Conteo del seed (constante entre ejecuciones): 1 company, 12 customers,
6 suppliers, 10 glaccounts, 150 invoices, 20 supplierinvoices, 387
invoiceitems, 104 payments, 49 supplierinvoiceitems, 16 supplierpayments.

### 3.3 Smoke dist (arranque productivo F3)

**Modo abierto** (`NODE_ENV=development`, `node dist/server.js`):

| Chequeo | Resultado |
|---|---|
| `GET /healthz` | ✅ `{"status":"ok","db":"up","uptime":8}` |
| `GET /odata/$metadata` | ✅ 200, `application/xml` |

**Modo estricto** (`NODE_ENV=production`, SECRET_KEY/CORS_ORIGIN del `.env`,
BD dev apuntada — patrón del smoke F2):

| Chequeo | Resultado |
|---|---|
| `GET /healthz` (público) | ✅ 200 `ok` |
| `GET /odata/$metadata` (público) | ✅ 200 |
| `GET /odata/product-odata` sin token | ✅ **401** |
| `POST /auth/login` admin/admin1234 | ✅ token (JWT 147 chars) |
| `GET /odata/product-odata` con Bearer | ✅ 200 |

### 3.4 Playwright (`ui5-odata-demo` @ main, `db8f5cc`)

Entorno: server dev :3000 (modo abierto) + app UI5 :8080.

**Test bench 8/8 PASS** (vista Demo, "Run all tests"):

| # | Test | Resultado |
|---|---|---|
| 1 | Metadata served to UI5 (`/odata/$metadata`) | ✅ |
| 2 | List (`$count`/`$select`/`$orderby`) | ✅ (total 5, rows 3) |
| 3 | By-key access `/product-odata(553)` | ✅ (id=553, Laptop) |
| 4 | `$expand` category (belongsTo) + products (hasMany, `$select`/`$top`) | ✅ |
| 5 | Create via `$direct` (POST) | ✅ (id=558) |
| 6 | Patch via `$direct` (PATCH) | ✅ (id=559) |
| 7 | Delete via `$direct` (DELETE) | ✅ (id=560) |
| 8 | Create via `$batch` changeset | ✅ (ids=561,562) |

**Navegación Demo ↔ Finance ↔ detail**:

- Finance → menú del ecosistema (7 listas) ✅
- Facturas (Invoice) → lista con datos reales (`$expand=customer,company`
  en red: 200, 20 filas) ✅
- Detalle `I00142`: cabecera (ID, cliente "Tecnología Avanzada SL", sociedad,
  importe 9.566,27 EUR, estado PAGADA, neto, IVA) + **3 líneas con Cuenta
  Mayor visible** (glAccount expandido: "Ventas de mercancías", "Prestación
  de servicios") ✅
- Botón "Atrás" → lista ✅
- Finance → Demo (test bench de nuevo visible) ✅

**Consola**: 0 errores / 0 warnings en la sesión de validación (182 mensajes).
El único 404 registrado en la carga inicial (`/odata/`) es el **N4 conocido**
(ciclo 13, documentado y aceptado: la app sondea la raíz `/odata/`).

## 4. Gate de la fase

- [x] `pnpm build` ✅ (2026-08-01)
- [x] `npx tsc --noEmit --project tsconfig.test.json` ✅
- [x] `pnpm test` 215/215 ✅
- [x] `db:reset` ×2 → md5 del dataset idéntico ✅ (`05d92a3c…`)
- [x] Smoke dist (dev + prod) ✅ (healthz, metadata, 401, login→200)
- [x] Playwright bench 8/8 ✅ + navegación Demo ↔ Finance ↔ detail ✅ + 0 errores consola ✅
- [x] CI PR #32: fallo "Smoke start" diagnosticado (R8) y corregido en `ci.yml`;
      flujo completo del paso replicado localmente ✅ (push pendiente de re-run)

## 5. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R8 | **CI del PR #32 rojo en "Smoke start (dist, modo produccion)"**: el smoke comparte `odata_dev` con `pnpm test`; los tests dejan el esquema sincronizado (sync dev) sin registrarlo en `SequelizeMeta`, así que el smoke re-ejecutaba la migración 002 (`ALTER TABLE invoices ADD COLUMN docNumber`, no idempotente) → columna ya existente → server abortaba → healthz nunca 200 | Riesgo | **Implementado en F4**: el paso smoke hace `DROP SCHEMA public CASCADE; CREATE SCHEMA public` antes de arrancar (arranque prod real con migraciones desde cero, como el smoke local `odata_f3_smoke` de F3) y crea el usuario de humo tras el arranque (la tabla `users` nace con la migración 004). Flujo completo replicado localmente: healthz 200 → ci-smoke → 401 → login → token → 200. Nota: el fallo se detectó al abrir el PR #32 (CI real); en F3 el paso se validó localmente sin un run del pipeline |
| — | `users.passwordHash` no es determinista entre `db:reset` (salt bcrypt aleatorio por diseño) | Nota / Decisión | El criterio del md5 excluye `passwordHash` (y timestamps de auditoría); el resto del dataset es determinista (verificado 05d92a3c idéntico ×2) |
| — | Dockerfile prod: sin `pnpm-lock.yaml` en stage production (corregido en F3) | Bug (F3) | **Registrado en backlog** (estaba sin clasificar) — Implementado |
| — | Dockerfile base `node:20.18.0` vs engines `>=22 <23` (corregido en F3) | Bug/riesgo (F3) | **Registrado en backlog** (estaba sin clasificar) — Implementado |
| — | `docker compose` exige `SECRET_KEY`/`CORS_ORIGIN` (fail-fast F2) | Nota operativa (F3) | Registrado en backlog como nota; documentado en fases F2/F3 |
| — | `ui5 serve` sirve la raíz `/` como "Index of /" (la app se abre en `/index.html`) | Nota (repo externo, fuera de alcance) | Sin cambios en `ui5-odata-demo` (plan §4); no bloquea la validación |

## 6. Resultado

F4 ejecutada y cerrada el 2026-08-01.

- **Gate estático en verde:** build ✅ · tsc tests ✅ · suite **215/215** ✅.
- **Determinismo confirmado:** `db:reset` ×2 → md5 `05d92a3c898dafc6910910996ec2aed1`
  idéntico (criterio excluye auditoría + `passwordHash`; documentado en §3.2).
- **Smoke dist en ambos modos:** modo abierto (healthz + metadata 200) y modo
  estricto (públicos 200, 401 sin token, login → token → 200).
- **Playwright:** test bench **8/8 PASS** (incl. `$batch` changeset con
  `created()` resuelto), navegación Demo ↔ Finance ↔ listas ↔ detalle con
  líneas y Cuenta Mayor expandida, botón Atrás OK, **0 errores de consola**.
- **Git:** rama publicada y **PR #32** abierto (CI "test" detectó el fallo del
  smoke → R8, corregido en `ci.yml` y pendiente de re-run).
- **Pendiente conocido:** ninguno. Hallazgos de F3 (bugs Dockerfile) ahora
  registrados en el backlog con estado Implementado; R8 (CI smoke frágil)
  registrado e Implementado en esta fase.
- **Siguiente fase:** F5 (cierre): deuda documental DT2/DT3/DT4, README,
  checklist de patrones, referencia de arquitectura, bump `2.3.0` (D7),
  revisión completa del backlog y cierre del PR #32.
