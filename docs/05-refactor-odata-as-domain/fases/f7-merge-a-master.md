# F7 — Merge a `master`

> **Fase:** F7 · **Esfuerzo:** Bajo · **Sesión:** 8/8
> **Depende de:** F0–F6 (todos los criterios de aceptación cumplidos).
> **Actualiza:** `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Integrar la rama `refactor/odata-as-domain` a `master` **solo** si se cumplen todas las
condiciones de aceptación globales. El merge requiere desbloquear la protección de `master` de
forma consciente (acción explícita del usuario).

---

## 1. Checklist de condiciones de aceptación (gate)

- [ ] F0–F6 ejecutadas y verificadas.
- [ ] `pnpm test` en verde (sin tests de REST colgantes; cobertura OData ≥ baseline).
- [ ] Demo `ui5-odata-demo` funcional contra `/odata` (CRUD + `$expand` + etag).
- [ ] Benchmark de regresión ≤10% en p95/throughput vs baseline (Fase P).
- [ ] `GET /api/*` no expuesto; solo `/odata`.
- [ ] Documentación (`README.md`, `AGENTS.md`, `docs/`) alineada al diseño OData-as-domain.
- [ ] `master` protegido: el merge requiere desbloquear la protección conscientemente.

---

## 2. Pasos (solo si el checklist está completo)

### 2.1 Commit final y push
```bash
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" add .
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" commit -m "refactor: OData como dominio único (REST eliminado)"
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" push origin refactor/odata-as-domain
```

### 2.2 Desbloquear protección de `master` (acción consciente)
```bash
gh api -X DELETE repos/horangelmillan/odata-server/branches/master/protection
```
> Esto solo lo ejecuta el usuario cuando confirme explícitamente. No se hace solo.

### 2.3 Merge
```bash
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" checkout master
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" merge refactor/odata-as-domain
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" push origin master
```

### 2.4 Tag de release
```bash
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" tag v2.0.0-odata-domain
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" push origin v2.0.0-odata-domain
```

---

## 3. Criterios de aceptación

- [ ] Todas las condiciones de aceptación cumplidas.
- [ ] Merge a `master` realizado (o decidido no hacerlo si falta algo).
- [ ] Tag aplicado.
- [ ] `docs/00-indice.md` marca el ciclo como completado.

---

## 4. Cierre del ciclo

Al terminar, actualizar `docs/00-indice.md`:
- Estado global: de "🚧 En progreso" a "✅ Completado (v2.0.0-odata-domain)".
- Enlazar el tag en la entrada de `05-refactor-odata-as-domain`.
