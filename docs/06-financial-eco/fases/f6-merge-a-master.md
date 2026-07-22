# F6 — Merge a `master` (flujo PR, ciclo 06)

> **Fase:** F6 · **Esfuerzo:** Bajo · **Sesión:** 22/N
> **Depende de:** F0–F5 (todos los criterios de aceptación cumplidos).
> **Actualiza:** `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Integrar `feature/financial-eco` a `master` **solo** si se cumplen todas las condiciones de
aceptación globales. El merge usa el **flujo PR** cerrado en el ciclo 05 (F7): `master` protegida
(PR + check `test` + `enforce_admins`), sin DELETE de protección.

---

## 1. Checklist de condiciones de aceptación (gate)

- [x] F0–F5 ejecutadas y verificadas.
- [x] `pnpm test` en verde (sin regresión; nuevos tests de ecosistema en verde).
- [x] `GET /api/*` no expuesto; solo `/odata` (intacto).
- [x] `pnpm db:reset` reproduce el ecosistema idéntico (re-montable verificado).
- [x] `$expand`/`$filter` financieros funcionan.
- [x] Documentación alineada.

---

## 2. Pasos (solo si el checklist está completo)

### 2.1 Commit final y push
```bash
git add .
git commit -m "feat(financial): ecosistema financiero simulado S/4HANA (re-montable)"
git push origin feature/financial-eco
```

### 2.2 Abrir PR a master (acción consciente del usuario)
```bash
gh pr create --base master --head feature/financial-eco \
  --title "feat: ecosistema financiero simulado S/4HANA" \
  --body "Ciclo 06: 8 dominios OData + seed idempotente re-montable. Cierra F0-F5."
```
El usuario entra al PR, espera el check `test` en verde y hace **Merge pull request** en GitHub
(protección de master vigente, sin DELETE).

### 2.3 Tag de release
Tras el merge a master:
```bash
git tag v2.1.0-financial-eco
git push origin v2.1.0-financial-eco
```

---

## 3. Criterios de aceptación

- [x] Todas las condiciones de aceptación cumplidas.
- [x] PR #5 abierto, check `test` verde, merge por GitHub (2026-07-16).
- [x] Tag `v2.1.0-financial-eco` aplicado (sobre el merge de PR #5, `2021b61`).
- [x] `docs/00-indice.md` marca el ciclo 06 como completado.

---

## 4. Cierre del ciclo

✅ **Ciclo 06 completado.** Merge de `feature/financial-eco` a `master` realizado vía
[PR #5](https://github.com/horangelmillan/odata-server/pull/5) el 2026-07-16 con el check
`test` en verde (CI con servicio Postgres). `docs/00-indice.md` actualizado: el ciclo 06
figura como completado (F0–F6) y se documenta que el prefijo `demo/` fue posteriormente
eliminado en PR #8 (endpoints planos). Tag de release `v2.1.0-financial-eco` aplicado
sobre el commit de merge (`2021b61`) durante el cierre documental posterior.
