# Plan de compatibilidad SAPUI5/OpenUI5 — odata-server

> Branch: `feat/odata-sapui5-compat`  
> Tag final: `v1.1.0`  
> Inicio: 2026-07-14

## Objetivo

Lograr compatibilidad 100% con SAPUI5/OpenUI5 OData v4, parcheando `@phrasecode/odata` v0.3.1 para cubrir las features que la librería no implementa de serie.

---

## Checklist de fases

| # | Fase | Descripción | Estado |
|---|---|---|---|
| A | Ruta por key | `GET /entityset/:id` para acceso a registro individual | ✅ |
| B | Endpoint `/$count` | `GET /entityset/$count` que devuelve el número total | ✅ |
| C.1 | Bypass SAPUI5 `$batch` | Documentar `groupId: "$direct"` como solución temporal | ⬜ |
| C.2 | Endpoint `/$batch` | Middleware propio para `POST /$batch` multipart | ⬜ |
| D | Navigation properties | Decoradores `@BelongsTo`/`@HasMany` en modelos OData | ⬜ |
| E | Tests | Tests unitarios + integración de todas las fases | ⬜ |
| F | Documentación + merge | `docs/14-*.md`, README, merge a master, tag `v1.1.0` | ⬜ |

---

## Resumen de sesiones

### Sesión 1 — Fase A: Ruta por key (2026-07-14)

**Qué se hizo:**
- Se creó el branch `feat/odata-sapui5-compat`
- Se parcheó `ExpressRouter.setUpODataRouters()` para registrar `router.get('/:id', ...)`
- La ruta extrae el `:id` de la URL, lo convierte en `$filter=id eq :id` y lo pasa al `QueryParser`
- El `scripts/patch-odata.mjs` se actualizó para aplicar el parche automáticamente vía postinstall

**Decisiones técnicas:**
- Se usó el patrón `/:id` (no `(/:id)`) porque Express no maneja paréntesis en rutas de forma natural
- La conversión a `$filter` se hace inyectando el parámetro en el query string original
- Si el usuario ya incluye `$filter` junto con `:id`, se rechaza con 400 (no mezclar key access con filter)
- El `@odata.context` se ajusta a `/$metadata#EntitySet/$entity` para que SAPUI5 reconozca la respuesta como entidad individual

**Próxima sesión:** Fase B — Endpoint `/$count`

### Sesión 2 — Fase B: Endpoint `/$count` (2026-07-14)

**Qué se hizo:**
- Se parcheó `ExpressRouter.setUpODataRouters()` para registrar `router.get('/\\$count', ...)`
- La ruta reutiliza el soporte nativo de `$count=true` de la librería: construye una URL con `$count=true` más los query params originales (incluido `$filter`), la pasa al `QueryParser` y llama a `controller.get()`
- Devuelve el valor de `@odata.count` como texto plano (`Content-Type: text/plain`), según el estándar OData v4
- La librería resuelve el count con un `SELECT COUNT(*)` separado (`model.count()`) usando el mismo `where`/`include` pero sin `limit`/`offset`, así que el filtro se aplica correctamente y la paginación (`$top`/`$skip`) no afecta el total

**Decisiones técnicas:**
- **El `$` debe escaparse en la ruta:** Express/`path-to-regexp` interpreta `$` como el ancla de fin-de-cadena. `router.get('/$count')` compila a `/^\/$count\/?$/i`, que nunca hace match. La solución es `router.get('/\\$count')` (en el archivo generado quedan dos `\` → la cadena JS es `/\$count` → `path-to-regexp` trata `$` como literal). Esto requiere `\\\\$count` en el template literal de `patch-odata.mjs`
- **Orden de rutas importa:** `/$count` se registra **antes** de `/:id`, porque `/:id` haría match de `$count` como valor del parámetro `id` (Express evalúa las rutas en orden de registro)
- Se verificó manualmente contra el servidor real: `/$count` → total; `/$count?$filter=precio gt 100` → filtrado; `/$count?$filter=precio gt 9999` → `0`; la ruta por key `/1` (Fase A) sigue funcionando

**Verificación:** `pnpm test` → 88 tests OK. Pruebas manuales de `/$count` (con y sin `$filter`) correctas.

**Próxima sesión:** Fase C.1 — Bypass SAPUI5 `$batch` (documentar `groupId: "$direct"`)

---

## Decisiones técnicas globales

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| Formato ruta key | `/:id` (Express friendly) | `(/:id)` — Express no lo interpreta bien |
| Ruta `/$count` | `/\\$count` (escapar `$`) + registrar antes de `/:id` | `/$count` sin escapar — `path-to-regexp` lo trata como ancla de regex |
| Respuesta `/$count` | Texto plano con `@odata.count` | JSON — SAPUI5 espera el número plano |
| Librería para `$batch` | `busboy` (streaming, madura, score 98) | Escribir parser propio (riesgoso) |
| Estrategia `$batch` | Middleware Express propio en `batch.middleware.ts` | Parchar la librería (muy acoplado) |
| Parches a librería | Via `scripts/patch-odata.mjs` (postinstall) | Modificar node_modules a mano (frágil) |

---

## Cómo retomar una sesión

```bash
git checkout feat/odata-sapui5-compat
git pull
# Leer este documento para saber dónde se quedó
# Ejecutar pnpm install (aplica parches vía postinstall)
```

Al terminar cada sesión:

```bash
git add .
git commit -m "fase X: descripción del cambio"
git push origin feat/odata-sapui5-compat
```
