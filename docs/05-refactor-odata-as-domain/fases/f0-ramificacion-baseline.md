# F0 — Ramificación y línea base (baseline)

> **Fase:** F0 · **Esfuerzo:** Bajo · **Sesión:** 1/8
> **Depende de:** nada (arranque del ciclo).
> **Actualiza:** `docs/00-indice.md` (estado global), este archivo (marcar ✅ al cerrar).

---

## 0. Objetivo

Crear la rama dedicada `refactor/odata-as-domain` desde `master`, congelar `master`, y dejar
registrada una **línea base de tests en verde** (164 passing + 1 todo) como referencia de
regresión para todo el ciclo. No se toca código en esta fase.

---

## 1. Pasos

### 1.1 Verificar estado limpio de `master`
```bash
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" status
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" branch --show-current   # debe decir "master"
```

### 1.2 Crear y posicionarse en la rama del ciclo
```bash
git -C "C:\Users\Horan\Desktop\servidor OData\servidor-odata" checkout -b refactor/odata-as-domain
```

### 1.3 Instalar dependencias (aplica parches OData vía postinstall)
```bash
cd "C:\Users\Horan\Desktop\servidor OData\servidor-odata"
pnpm install
```

### 1.4 Baseline de tests
Ejecutar los tests (requiere Postgres; `docker compose up -d db` si no está corriendo):
```bash
docker compose up -d db
pnpm test
```
**Registrar el número exacto** de tests en verde aquí abajo al cerrar la fase:
```
BASELINE: ___ passing + ___ todo   (fecha: ____)
```

### 1.5 (Opcional) Tag de baseline
Para poder comparar benchmark más tarde contra este punto:
```bash
git tag refactor-baseline
```

---

## 2. Criterios de aceptación

- [ ] Rama `refactor/odata-as-domain` creada y activa.
- [ ] `pnpm install` exitoso (parches OData aplicados).
- [ ] Tests en verde; número anotado como baseline.
- [ ] `master` sin cambios (todo el trabajo queda en la rama).

---

## 3. Documentación a actualizar al cerrar

- `docs/00-indice.md`: cambiar estado global de "📋 Planificado" a "🚧 En progreso (F0 done)".
- Este archivo: marcar checklist F0 como ✅ y anotar el baseline.

---

## 4. Siguiente fase

➡️ [`f1-product-como-dominio-odata.md`](f1-product-como-dominio-odata.md) — migrar `product` a dominio OData.
