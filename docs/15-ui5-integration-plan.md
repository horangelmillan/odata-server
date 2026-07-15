# Plan de validación UI5 — Prueba de integración exhaustiva contra el servidor OData

> **Propósito:** este archivo contiene el prompt óptimo para ejecutar, en una sesión
> futura, la construcción de un proyecto demo UI5/OpenUI5 que valide al 100% la
> compatibilidad del servidor OData de este repo (Fases A–P, ver `docs/14`).
> El agente de la próxima sesión debe leer este archivo y ejecutar el prompt que
> aparece en la sección "Prompt para la próxima sesión".

## Cómo ejecutar este plan en la próxima sesión

Pega el siguiente comando/prompt al iniciar la nueva sesión (el agente debe leer
`docs/15-ui5-integration-plan.md` y seguir el prompt incluido):

```
Lee docs/15-ui5-integration-plan.md de este repositorio y ejecuta el plan "Prompt para
la próxima sesión" que contiene: investiga la última versión de UI5/OpenUI5 y las
skills/tooling óptimas de calidad, instálalas en un proyecto demo UI5 nuevo (fuera de
este repo), y valida la integración contra TODOS los componentes OData del servidor
(/odata) para emitir un reporte de compatibilidad al 100%. No modifiques el servidor
salvo indicación explícita; si hay gap, repórtalo.
```

---

## Ejecución del servidor OData (prerequisito para el demo UI5)

El proyecto demo UI5 consume `http://localhost:3000/odata` (u otro puerto según `PORT`).
**Antes de levantar el demo, el servidor OData debe estar corriendo y con Postgres
disponible.** A continuación TODAS las formas de ejecutarlo, con implicaciones,
advertencias y cómo manejar puertos ocupados y otros fallos frecuentes.

### 0. Prerequisitos comunes
- **Node 20** (usa `nvm`/`nvm-windows` si hay varias versiones; el repo espera 20.x).
- **Postgres** accesible. En dev apunta a la BD de Docker (`DEV_*` en `.env`); en
  producción a `DB_*` (ver `src/common/config/env.config.ts`).
- **`.env` presente** en la raíz (copiar de `.env.example` si falta). Define al menos
  `PORT`, `NODE_ENV`, y las credenciales `DEV_*` / `DB_*`.
- El arranque ejecuta `db.sync({ alter: true })`, así que la BD debe estar lista.
- El servidor usa `ts-node` en modo ESM (`pnpm dev`). No requiere `pnpm build` previo.

### 1. Levantar SOLO la base de datos (Docker)
El server y la BD viven en `docker-compose.yml` (perfiles: `db`, `api`, `pgadmin`).
Para dejar la BD disponible y arrancar el server por cmd/PowerShell (recomendado para
tener logs claros):

```bash
# PowerShell o cmd (desde la raíz del repo)
docker compose up -d            # levanta db (+ api y pgadmin si están en el perfil)
docker compose ps               # verifica que servidor-odata-db-1 está "healthy"
```

- **Implicación:** `docker compose up` (sin `--build`) reusa el container previo; si
  cambiaste el parche `scripts/patch-odata.mjs`, el container sirve código viejo en
  `node_modules` (volumen anónimo cacheado). Usa `docker compose up --build` para refrescar.
- **Advertencia:** si el daemon de Docker no está corriendo, `docker compose` falla con
  error de pipe. Arranca Docker Desktop primero y espera a que el engine esté listo.
- Para ver la BD por interfaz: `servidor-odata-pgadmin-1` (puerto 80/5050 según compose).

### 2. Ejecutar el server por línea de comandos (recomendado para pruebas)
Una vez la BD está healthy, arranca el server en primer plano para ver logs:

**CMD:**
```cmd
pnpm dev
```
**PowerShell:**
```powershell
pnpm dev
```

- **Implicación:** `pnpm dev` corre `scripts/patch-odata.mjs` (parchea `@phrasecode/odata`
  en `node_modules`) y luego `ts-node --watch` con hot-reload. El server queda en primer
  plano; `Ctrl+C` lo detiene.
- **Puerto:** respeta `PORT` de `.env` (default **3000**). El server de pruebas de Fase P
  usó 3002/3003 para aislar; para el demo UI5 usa 3000 (o el que apunte tu `ODataModel`).
- **Cómo confirmar que está vivo (IMPORTANTE):** NO uses `curl` suelto en PowerShell —
  allí `curl` es alias de `Invoke-WebRequest` y acepta parámetros distintos. Usa
  `curl.exe` explícito o `Invoke-WebRequest`:
  ```powershell
  curl.exe -s -o $null -w "%{http_code}\n" "http://127.0.0.1:3000/odata/product-odata/`$count"
  # o bien:
  (Invoke-WebRequest -Uri "http://127.0.0.1:3000/odata/product-odata/`$count" -UseBasicParsing).StatusCode
  ```
  Espera **`200`** con un JSON de productos. Nota: `/` y `/odata/` devuelven 404 (no
  existen); el healthcheck correcto es `/odata/product-odata/$count` o `/odata/$metadata`.

### 3. Ejecutar el server con Docker (todo en contenedor)
```bash
docker compose up -d           # perfiles api+db
docker compose logs -f api     # sigue los logs del container del server
```
- **Implicación:** el container `servidor-odata-api-1` corre el build/start de producción.
  Útil para emular el entorno real, pero los logs de `ts-node`/errores son menos directos.
- **Advertencia:** al cambiar código, necesitas `docker compose up --build` (el volumen
  anónimo de `node_modules` cachea dependencias/parche).

### 4. Ejecutar solo los TESTS (no levanta server HTTP)
```bash
pnpm test
```
- **Implicación:** Vitest arranca su propio server de prueba (puerto 3100) y requiere
  Postgres (Docker) para los tests de integración. Si la BD no está, se **salta** el suite
  de integración (`describe.skipIf(!dbAvailable)`) y solo corren los unitarios — no es
  fallo, pero tampoco valida integración.
- **Advertencia:** `tsc --noEmit` / `pnpm build` tienen errores TypeScript **preexistentes**
  (bcrypt, datasource, ExpressRouter, controllers REST) que NO son de las fases OData.
  El gate real de calidad es `pnpm test` (Vitest transpila con esbuild, ignora esos
  errores). No uses `tsc` como criterio de éxito.
- Resultado esperado actual: **148 passing + 1 todo**, 23 test files, contra Postgres.

### 5. Manejo de PUERTOS OCUPADOS y procesos zombie (lección de sesiones previas)
Síntoma típico: el server arranca pero se cae con `EADDRINUSE` (puerto en uso) o quedan
procesos `node` huérfanos de intentos anteriores compitiendo por CPU/PUERTO.

**Diagnóstico (PowerShell):**
```powershell
netstat -ano | Select-String ":3000|:3002|:3003" | Where-Object { $_ -match "LISTENING" }
# el último número de cada línea es el PID dueño del puerto
Get-Process -Name "node" | Select-Object Id, CPU, StartTime
```
**Matar un proceso por PID:**
```powershell
Stop-Process -Id <PID> -Force
```
**Matar todos los node (¡cuidado, mata también otros proyectos node!):**
```powershell
Get-Process -Name "node" | ForEach-Object { Stop-Process -Id $_.Id -Force }
```

- **Regla de oro para benchmark/pruebas de carga:** NO corras dos servers OData a la vez
  en la misma máquina sin aislar (ver `scripts/bench/`). En Fase P comprobar que correr
  feature+baseline simultáneos mostraba ~2x peor p95 por competencia de CPU: era ruido,
  no regresión. Para pruebas UI5 normales basta un solo server en 3000.
- Si ves respuestas anómalas (p.ej. `curl` devuelve `4` o texto raro), casi siempre es
  el alias `curl`→`Invoke-WebRequest` en PowerShell; usa `curl.exe` o `Invoke-WebRequest`.

### 6. Orden recomendado para la sesión de validación UI5
1. `docker compose up -d` → espera `servidor-odata-db-1` healthy.
2. En una terminal separada: `pnpm dev` (server en 3000, logs visibles).
3. Verifica health: `curl.exe .../odata/product-odata/$count` → 200.
4. En OTRA carpeta (no este repo): levanta el proyecto demo UI5 apuntando a
   `http://localhost:3000/odata`.
5. Si algo falla, revisa la sección 5 (puertos/zombies) antes de tocar código.

---

## Prompt para la próxima sesión

```
# Objetivo de la sesión

Construir un proyecto demo pequeño en **SAPUI5 / OpenUI5 (OData V4)** que sirva como
**banca de pruebas de integración** contra el servidor OData de este repo, con el fin de
**validar al 100% la compatibilidad** de la API OData expuesta (Fases A–P del plan
`docs/14-sapui5-compatibility-plan.md`). La sesión tiene 3 entregas encadenadas:

1. **Investigación exhaustiva** de la versión más reciente de UI5/OpenUI5 y del ecosistema
   de herramientas/“skills” (tooling, librerías, reglas de calidad, linters y agent-skills)
   que más aportan a la calidad de código UI5.
2. **Instalación de esas skills** en el proyecto demo (versión fijada a la última estable).
3. **Prueba de integración contra TODOS los componentes/features OData posibles**, para
   emitir un **reporte fundado de compatibilidad al 100%** (o del gap exacto).

# Contexto del servidor OData bajo prueba (este repo: `servidor-odata`)

El servidor expone OData v4 en `/odata` con estas capacidades YA verificadas (ver
`docs/14-sapui5-compatibility-plan.md` y `README.md`):
- Entidades: `ProductOData` (id, nombre, precio DECIMAL, categoria, categoriaId,
  createdAt/updatedAt como `Edm.DateTimeOffset` en ISO 8601) y `CategoryOData`.
- `GET /odata/<entidad>` con recorte de navegación: `$select`, `$filter`, `$orderby`,
  `$top`, `$skip`, `$count=true` (devuelve `@odata.count`), y `$expand` (`category` belongsTo,
  `products` hasMany) con recorte anidado (`$expand=products($select=...;$filter=...;$top=...)`).
- `GET /odata/<entidad>/:id` (acceso por key) y `GET /odata/<entidad>/$count` (texto plano).
- `$batch` (`POST /odata/$batch`, multipart/mixed): lecturas y **escritura** (changesets
  atómicos con `Content-ID`, referencias `$1`, `Location` en 201) y **escritura directa**
  por entidad (`POST/PATCH/PUT/DELETE /odata/<entidad>[/:id]`, modo `$direct` de SAPUI5).
- Negociación `$format`: `json`/`application/json` aceptado (se ignora); cualquier otro → 415.
- `$metadata` con `$Endpoint` en kebab-case coherente con las rutas.
- El modelo OData NO usa `IEEE754Compatible` explícito; `precio` llega como string (Edm.Decimal).
  SAPUI5 `ODataModel v4` emite peticiones URL-encodeadas (`%2C`, `%20`) y cabeceras
  `OData-Version: 4.0`, `Accept: application/json;odata.metadata=minimal`.

# Paso 1 — Investigación (usar Context7 + web search + registro npm)

- Determina la **última versión estable** de OpenUI5/SAPUI5 y de `@sapui5`/`sap-ui-core`,
  UI5 Tooling (`@ui5/cli`), y del runtime `sap/ui/model/odata/v4/ODataModel`.
- Investiga y lista las **“skills”/herramientas óptimas** para calidad de código UI5, con
  criterio de popularidad + mantenimiento + valor: p.ej. UI5 Tooling, ESLint + reglas
  `@ui5/eslint-plugin-ui5` / `eslint-plugin-ui5` (o el oficial de SAP), TypeScript sobre
  UI5, `ui5-lib`/`ui5-app` generators, `fiori-tools` (SAP Fiori tools), y cualquier
  **agent-skill** relevante (p.ej. context7 para docs de UI5, skill de node/TS).
- Para cada skill: versión recomendada, para qué sirve, y por qué aporta a la calidad.
- No instales aún; entrega la **matriz de decisiones**.

# Paso 2 — Scaffold del proyecto demo + instalación de skills

- Crea el proyecto UI5 en una carpeta nueva (fuera de este repo, p.ej. `../ui5-odata-demo`)
  usando UI5 Tooling / generator ui5-app, en **TypeScript** si la skill lo justifica.
- Instala las skills seleccionadas (fijando versiones a la última estable).
- Configura `ODataModel v4` apuntando a `http://localhost:3000/odata` (o el puerto del server
  de prueba), con `groupId` por defecto y un botón/acción que use `groupId: "$direct"` para
  probar escritura directa.
- El proyecto debe poder levantarse con `ui5 serve` y consumir el servidor OData de este repo
  (que debe estar corriendo contra Postgres).
- **Arranque del server OData:** sigue la sección "Ejecución del servidor OData" de este mismo
  archivo (Docker, cmd, PowerShell, tests, y sobre todo el manejo de PUERTOS OCUPADOS y
  procesos node zombie en la sección 5). Confirma health con
  `curl.exe .../odata/product-odata/$count` → 200 ANTES de probar el demo. No uses `curl`
  suelto en PowerShell (es alias de Invoke-WebRequest). Nunca corras dos servers OData a la
  vez en la misma máquina sin aislar (compiten por CPU y sesgan latencia).

# Paso 3 — Prueba de integración contra TODOS los componentes OData

Crea vistas/controllers que ejerzan **cada** capacidad del servidor, incluyendo:
- Lista (`List`/`Table`) con `$top`, `$skip`, `$orderby`, `$filter` y `$count` (paginación +
  contador), y `$select` restrictivo.
- `$expand` belongsTo (`category`) y hasMany (`products`) con recorte anidado.
- Acceso por key (`/product-odata(1)`) en un detail page.
- **Escritura**: formulario de alta (`POST`), edición (`PATCH`/`PUT`) y borrado (`DELETE`)
  vía escritura directa (`$direct`) y vía `$batch` changeset (con `Content-ID` y deep-create
  si aplica).
- Cabeceras reales de SAPUI5 (`OData-Version: 4.0`, `Accept: application/json;odata.metadata=minimal`),
  y `precio` (`Edm.Decimal`) mostrado/introducido correctamente.
- Verifica que `createdAt`/`updatedAt` (`Edm.DateTimeOffset`) se parsean sin error en el modelo.

# Entregables y criterio de aceptación

- **Reporte de compatibilidad** que confirme soporte de cada feature (✅/❌) con evidencia
  (request/response o captura de la app). Objetivo: **100% compatible**; si hay gap,
  documentar exactamente qué falla y por qué (posible bug del server o limitación de UI5).
- Si el gap es del **servidor**, reportarlo como hallazgo para corregir en `servidor-odata`
  (NO lo corrijas en esta sesión salvo que se pida explícitamente).
- Matriz de skills instaladas con versiones.
- El proyecto demo debe quedar ejecutable (`ui5 serve`) y con las skills de calidad activas
  (ESLint sin errores, build OK).

# Restricciones

- No modificar el servidor OData salvo que sea estrictamente necesario para la prueba y se
  indique explícitamente; si lo haces, repórtalo.
- Fijar versiones a las últimas estables (no `latest` flotante en lockfile).
- Dejar el proyecto demo en una carpeta separada, no dentro de `servidor-odata`.
```
