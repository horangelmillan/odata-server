# F2 — CI y arranque robusto (R2, R3, M3)

> Fase 2 del ciclo 17 — "Operación Segura". Rama `feat/operacion-segura`.

## 1. Objetivo

- **R3** — `initServer` aborta con `process.exit(1)` si la BD/migraciones fallan
  (antes: proceso vivo sin escuchar, exit 0).
- **R2** — la imagen Docker prod se construye en CI (gate manual del ciclo 16 → pipeline).
- **M3** — gate de `pnpm audit --prod` en CI (fail si aparece un advisory NUEVO;
  las cadenas conocidas y documentadas no rompen el pipeline).

## 2. Alcance

| Archivo | Cambio |
|---|---|
| `server.ts` | catch de `initServer` → `process.exit(1)` con mensaje FATAL claro |
| `.github/workflows/ci.yml` | paso "Audit de dependencias" + job `docker-build` (target production, sin push) |
| `docs/17-operacion-segura/fases/f2-ci-arranque.md` | este documento |
| Backlog | R2, R3, M3 → Implementado |

## 3. Diseño

### 3.1 Exit(1) en arranque (R3)

`initServer` (catch) hace `console.error("FATAL: …")` + `process.exit(1)`. Verificado
localmente: con `DB=odata_bd_inexistente` el proceso sale con código 1 (antes quedaba
vivo sin escuchar).

### 3.2 Audit gate (M3)

`pnpm audit --prod --json` → script node que clasifica los advisories:

- **Conocidos (no rompen el pipeline):** rutas que incluyen `@mapbox/node-pre-gyp`
  (cadena de build de bcrypt, 12 advisories — D4) o `uuid@8.3.2` (1 moderada inerte;
  se elimina con override en F4 — D5).
- **Nuevos (rompen el pipeline):** cualquier advisory fuera de esas rutas → exit 1
  con el listado.

Cuando F4 elimine uuid y una futura versión de bcrypt deje de usar node-pre-gyp, el
filtro queda vacío automáticamente (nada que excluir) y el gate es 100% estricto.

### 3.3 Job docker-build (R2)

Job independiente en `ci.yml`: `docker build --target production -t odata-server:ci .`
valida el Dockerfile completo (stage production: install `--prod` + dist). Sin push
(no hay registry). Ejecución en paralelo con el job `test`.

## 4. Pasos

1. `server.ts`: exit(1) (edit §2).
2. `ci.yml`: paso de audit + job docker-build.
3. Verificación local: `pnpm build` ✅; arranque con BD inexistente → exit 1 ✅;
   filtro de audit contra el audit real → "Audit OK: 14 advisory(ies)" ✅;
   `pnpm test` 215/215 ✅.
4. Cierre: checklist, gate, hallazgos, resultado; backlog.

> Nota: el job `docker-build` y el paso de audit en el pipeline real se validan con el
> CI del PR (push de la rama; el daemon Docker local está apagado en esta máquina).

## 5. Checklist de ejecución

- [x] `initServer` hace `process.exit(1)` ante fallo de BD/migraciones (verificado: exit 1).
- [x] Paso de audit en CI: fail solo con advisories nuevos (filtro de cadenas conocidas).
- [x] Job `docker-build` (target production) en CI.
- [x] Suite 215/215 tras el cambio de `server.ts`.
- [ ] CI real en verde con los pasos nuevos (se valida en el push/PR).

## 6. Gate de la fase

- [x] `pnpm build` ✅
- [x] `pnpm test` 215/215 ✅ (el exit(1) no rompe tests)
- [x] Arranque con BD inexistente → `EXIT-CODE: 1` ✅
- [x] Filtro de audit: 14 advisories conocidos, 0 nuevos ✅
- [ ] CI real (push) con job docker-build + audit ✅ — *pendiente de push/PR*

## 7. Hallazgos detectados

| ID | Hallazgo | Clasificación | Resolución |
|---|---|---|---|
| R3 | initServer sin exit(1) | Riesgo | Resuelto: `process.exit(1)` con mensaje FATAL (verificado exit 1) |
| R2 | CI sin build de imagen Docker | Riesgo | Resuelto: job `docker-build` (target production; validación real en el CI del PR) |
| M3 | Sin gate de audit | Mejora | Resuelto: paso con filtro de cadenas conocidas (bcrypt build / uuid) |

## 8. Resultado

F2 ejecutada el 2026-08-01 (pendiente de validación del pipeline real en el push).

- **Arranque robusto (R3):** fallo de BD/migraciones → FATAL + exit 1. Verificado
  localmente con BD inexistente.
- **CI (R2/M3):** job `docker-build` (imagen prod) + gate de audit con allowlist
  documentada de las cadenas conocidas. El pipeline real se valida al pushear (Docker
  local apagado).
- **Gate local:** build ✅ · suite 215/215 ✅ · exit(1) ✅ · filtro audit ✅.
- **Siguiente fase:** F3 (conexión/BD: statement_timeout, pool por env, SSL CA,
  mensaje 500 genérico).
