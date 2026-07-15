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
