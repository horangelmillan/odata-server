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
| A | Ruta por key | `GET /entityset/:id` para acceso a registro individual | 🔄 |
| B | Endpoint `/$count` | `GET /entityset/$count` que devuelve el número total | ⬜ |
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

---

## Decisiones técnicas globales

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| Formato ruta key | `/:id` (Express friendly) | `(/:id)` — Express no lo interpreta bien |
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
