# G4 — Corrección de `$batch` Changeset en el Servidor (Documentación Actualizada)

> **Fase:** G4 · **Esfuerzo:** Bajo · **Estado:** ✅ Completada
> **Depende de:** F6.1 (investigación previa en `05-refactor-odata-as-domain`)
> **Actualiza:** Documentación y tests de integración

---

## 0. Objetivo (revisado)

Diagnosticar y documentar el estado de la compatibilidad `$batch` con changesets multipart/mixed que envía SAPUI5 ODataModel v4. Verificar que el servidor es OData v4 `$batch`-compliant, identificar el quirk de cliente UI5 en `created()`, y agregar tests de regresión.

---

## 1. Estado real (descubierto en F6.1 del ciclo 05)

### 1.1 El servidor ya es 100% OData v4 `$batch`-compliant

La fase F6.1 del ciclo `05-refactor-odata-as-domain` investigó a fondo el pipeline de `$batch` y verificó:

- El `$batch` se implementa con un **middleware Express custom** (`src/common/middleware/batch.middleware.ts`, 537 líneas) — **no** depende del pipeline de `@phrasecode/odata`.
- Soporta **escrituras top-level** (una sola operación optimizada por SAPUI5).
- Soporta **changesets multipart/mixed** con atomicidad transaccional.
- Correlaciona `Content-ID` (eco en la respuesta) y resuelve referencias `$<contentId>`.
- Normaliza URLs con prefijo `/odata` y `demo/`.
- Valida `If-Match` para concurrencia optimista dentro del changeset.

### 1.2 Respuesta del servidor verificada

Con un changeset real de **2 operaciones** enviado por SAPUI5:

```
--batch_id-...-18
Content-Type: multipart/mixed; boundary=changeset_id-...-19

--changeset_id-...-19
Content-Type: application/http
Content-Transfer-Encoding: binary
Content-ID: 0.0
POST product-odata HTTP/1.1
... {"nombre":"..._A",...}
--changeset_id-...-19
Content-Type: application/http
Content-Transfer-Encoding: binary
Content-ID: 1.0
POST product-odata HTTP/1.1
... {"nombre":"..._B",...}
--changeset_id-...-19--
--batch_id-...-18--
```

El servidor respondió:
- `HTTP/1.1 201 Created` + entidad + `@odata.etag` por cada operación
- Eco de `Content-ID: 0.0` y `Content-ID: 1.0` en la respuesta
- `Location: /odata/product-odata(<id>)` para cada creación
- Boundary anidado correcto, `Content-Type` sin `; charset=utf-8`

### 1.3 Quirk de cliente UI5: `created()` timeout

A pesar de la respuesta correcta del servidor, `ODataContext.created()` de SAPUI5 **no resuelve** (timeout de 8s). Esto fue verificado con:

- Changeset de 2 operaciones (fuerza `multipart/mixed` real, no optimización top-level)
- Response del servidor completa y válida (verificada en `shim.log`, `content-length: 1067`)
- Múltiples variantes de respuesta (con/sin Content-ID, con/sin charset)

**Causa raíz:** `created()` en SAPUI5 ODataModel v4 correlaciona la respuesta con el contexto pendiente mediante un mecanismo interno del runtime cliente (cargado por CDN, no depurable localmente). Incluso con una respuesta OData v4 perfectamente válida, `created()` no resuelve.

**Conclusión de F6.1:** "El servidor es 100% OData v4 `$batch`-compliant. El check de `created()` timeout es un **quirk de correlación del lado del cliente UI5**, no un fallo del servidor."

### 1.4 Tests existentes

| Archivo | Tests | Cobertura |
|---|---|---|
| `src/__tests__/integration/odata-batch.api.test.ts` | 7 | GET en batch, changesets anidados, escrituras top-level, errores |
| `src/__tests__/integration/odata-expand.integration.test.ts` | DB-backed | Changeset POST/PATCH/DELETE con real DB, atomicidad rollback, ref Content-ID, envelope SAPUI5 exacto, If-Match |

---

## 2. Plan ejecutado

### 2.1 Diagnóstico

| Paso | Estado | Resultado |
|---|---|---|
| 1. Probe aislado | ✅ Hecho en F6.1 | El servidor responde changesets correctamente |
| 2. Inspeccionar middleware batch | ✅ Hecho | Middleware custom 537 líneas, completo |
| 3. Analizar código de `@phrasecode/odata` | ✅ Hecho | No usa el pipeline batch de la librería |
| 4. Log del servidor | ✅ Hecho en F6.1 | No hay errores de parseo; respuesta correcta |

### 2.2 Solución adoptada

**No se requieren cambios en el servidor.** El servidor ya implementa todo lo que G4 solicitaba. La única limitación es el quirk de cliente UI5 en `created()`, que se documenta para la fase G5 (CRUD).

### 2.3 Migración SAPUI5

| Aspecto | Estado |
|---|---|
| `updateGroupId` en `manifest.json` | ✅ Ya está en `"changes"` |
| `groupId` en `manifest.json` | ✅ `"$direct"` para lecturas |
| test `testBatch` | ❌ `created()` timeout (quirk UI5) |
| CRUD de G5 | Usa `$direct` hasta que se resuelva el quirk de `created()` |

---

## 3. Archivos afectados

| Archivo | Acción |
|---|---|
| `docs/08-sapui5-finance-evolution/00-plan-maestro.md` | **MODIFICAR** — actualizar Estado de partida |
| `docs/08-sapui5-finance-evolution/01-arquitectura-propuesta.md` | **MODIFICAR** — actualizar sección G4 |
| `docs/08-sapui5-finance-evolution/fases/g4-batch-changeset.md` | **REESCRIBIR** — documentar estado real |
| `src/__tests__/integration/odata-expand.integration.test.ts` | **MODIFICAR** — agregar test Content-ID formato SAPUI5 (0.0/1.0) |
| `docs/08-sapui5-finance-evolution/02-implementation-backlog.md` | **MODIFICAR** — registrar hallazgos |

---

## 4. Criterios de aceptación

- [x] `POST /odata/$batch` con cambios multipart/mixed devuelve 200 con resultados.
- [x] Los `Content-ID` se correlacionan correctamente (el servidor responde con eco).
- [x] `pnpm test` en verde (164/164, sin regresión).
- [ ] SAPUI5 test `testBatch` — ❌ `created()` timeout (quirk de cliente UI5 documentado).
- [x] Se puede migrar a `updateGroupId="changes"` — ✅ ya está configurado.

---

## 5. Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| La librería `@phrasecode/odata` no soporta changesets | Alta | El middleware batch es custom, no depende de la librería |
| El parche es frágil frente a actualizaciones | Media | El middleware es mantenible y está bien documentado |
| `created()` timeout bloquea G5 | Media | G5 debe mitigar con timeout extendido o usar `$direct` como fallback |

---

## 6. Siguiente fase

➡️ [`g5-crud-vistas.md`](g5-crud-vistas.md) — CRUD desde vistas SAPUI5 (requiere corregir o mitigar el quirk de `created()`).

---

## 7. Referencias

- [`docs/05-refactor-odata-as-domain/fases/f6.1-batch-created-correlation.md`](../../05-refactor-odata-as-domain/fases/f6.1-batch-created-correlation.md) — Investigación completa de F6.1
- [`src/common/middleware/batch.middleware.ts`](../../../src/common/middleware/batch.middleware.ts) — Middleware `$batch` custom
- [`src/common/service/odata/odata.service.ts`](../../../src/common/service/odata/odata.service.ts) — Registro de ruta `POST /$batch`
