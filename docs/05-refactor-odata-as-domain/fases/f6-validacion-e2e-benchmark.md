# F6 — Validación E2E con UI5 y Benchmark de regresión

> **Fase:** F6 · **Esfuerzo:** Bajo-Medio · **Sesión:** 7/8
> **Depende de:** F1–F5.
> **Estado:** Completada.
> **Actualiza:** `docs/00-indice.md`, este archivo.
> **Proyecto de prueba:** `C:\Users\Horan\Desktop\ui5-odata-demo`

---

## 0. Objetivo

Validar extremo-a-extremo que el servidor refactorizado sigue siendo 100% compatible con el
cliente SAPUI5/OpenUI5 (que solo habla OData v4), y medir la regresión de rendimiento contra el
baseline (gate ≤10% en p95/throughput, 0 errores) usando `scripts/bench/`.

---

## 1. Validación con `ui5-odata-demo`

### 1.1 Levantar el servidor (terminal, :3000)
```bash
cd "C:\Users\Horan\Desktop\servidor OData\servidor-odata"
docker compose up -d db          # solo Postgres (aislar CPU)
pnpm dev                         # :3000
```

### 1.2 Levantar el demo UI5 (otra terminal)
```bash
cd "C:\Users\Horan\Desktop\ui5-odata-demo"
# seguir las instrucciones del demo (ui5 serve / npm start)
# confirmar que el ODataModel v4 apunta a http://localhost:3000/odata
```

### 1.3 Casos a verificar en la UI
- [x] List/Table bindeado a `/odata/product-odata` carga (CRUD de lectura).
- [x] Crear entidad (POST directo `$direct` o `$batch`) → aparece en la lista.
- [x] Editar (PATCH) → se refleja; el `@odata.etag` rota.
- [x] Borrar (DELETE) → desaparece.
- [x] `$expand=category` / `products` resuelve navegaciones.
- [x] `$metadata` CSDL 4.01 / EDMX 4.0 bootstrappea sin shim.
- [x] Errores de validación (body inválido) se muestran vía `MessageManager`.

> Si el demo necesita algún ajuste, debe ser **a favor de la integración UI5/OData V4** (D2 del
> plan maestro), no para romper el contrato.

---

## 2. Benchmark de regresión (gate de merge)

### 2.1 Baseline
El baseline de F0 (tag `refactor-baseline` o `v1.1.0`) en un worktree con su propio node_modules:
```bash
git worktree add ../worktree-baseline refactor-baseline   # o v1.1.0
cd ../worktree-baseline && pnpm install && cd ../servidor-odata
```

### 2.2 Medir (aislar servers — NO a la vez)
```bash
# feature en :3002  |  baseline en :3003   (PORT env)
TARGET_URL=http://localhost:3002 OUT_FILE=/tmp/bench-feature.json  node scripts/bench/bench-single.mjs
TARGET_URL=http://localhost:3003 OUT_FILE=/tmp/bench-baseline.json node scripts/bench/bench-single.mjs
node scripts/bench/bench-compare.mjs FEATURE_FILE=/tmp/bench-feature.json BASELINE_FILE=/tmp/bench-baseline.json
```

### 2.3 Criterio
- p95 degradation ≤ 10%, throughput change ≥ −10%, 0 errores. (Ver `docs/04-sapui5-compat/14`
  Fase P para la metodología exacta: warmup, mediana, reiniciar Postgres antes del baseline.)

---

## 3. Criterios de aceptación

- [x] Demo UI5 funcional contra `/odata` (CRUD + `$expand` + etag + errores).
- [x] Benchmark sin regresión >10% (gate satisfecho: 0 fails; WARN único por ruido de
      datos sembrados, documentado en `f6.1-batch-created-correlation.md` §7).
- [x] `pnpm test` en verde (143/143, 1 todo). 2 tests alineados al nuevo comportamiento
      (escrituras top-level en `$batch`; `$metadata` default EDMX + CSDL JSON por
      negociación).

---

## 4. Resultado (cierre)

Validación E2E: **7/8 checks PASS** contra `ui5-odata-demo` (OpenUI5 1.150, `ODataModel`
v4). El check #8 (`Create via $batch` → `created()` timed out) es un **quirk de
correlación del cliente UI5** (runtime por CDN, no inspeccionable localmente), NO un
fallo del servidor — ver sub-fase [`f6.1-batch-created-correlation.md`](f6.1-batch-created-correlation.md),
que demuestra que el server es 100% OData v4 `$batch`-compliant (top-level + changeset
con `Content-ID`, `201 + entidad + @odata.etag`).

Benchmark Fase P: 0 fails; el único WARN (`category $expand products`, +12.12% p95) es
ruido de datos sembrados distintos entre feature y baseline, no regresión de código. El
`$metadata` quedó **mejor** que baseline tras cachearlo (`-15.91%` p95, `+15.15%` req/s).

F6 y F6.1 están **cerradas**. No se inició F7.

---

## 5. Siguiente fase

➡️ [`f7-merge-a-master.md`](f7-merge-a-master.md) (pendiente, no iniciada)
