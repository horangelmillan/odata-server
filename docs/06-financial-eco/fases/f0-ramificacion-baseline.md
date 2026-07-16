# F0 — Rama dedicada y baseline del ciclo 06

> **Fase:** F0 · **Esfuerzo:** Bajo · **Sesión:** 1/N
> **Depende de:** Ciclo 05 cerrado en `master` (`v2.0.0-odata-domain`).
> **Actualiza:** `docs/00-indice.md`, `docs/06-financial-eco/00-plan-maestro.md`, este archivo.

---

## 0. Objetivo

Crear la rama dedicada `feature/financial-eco` a partir de `master` (que ya contiene el ciclo 05)
y registrar el baseline de tests como línea base de este ciclo. **No se hace merge a `master`
hasta cumplir todas las condiciones de aceptación (F6).**

---

## 1. Pasos

### 1.1 Crear rama desde master
```bash
git checkout master
git pull origin master
git checkout -b feature/financial-eco
```

### 1.2 Baseline de tests
```bash
pnpm test 2>&1 | tail -n 5
```
Anotar el número (esperado: 143 passed, 1 todo, 0 failed). Este es el baseline de regresión.

### 1.3 Inicializar docs del ciclo 06
- Crear `docs/06-financial-eco/` y `fases/`.
- Este `00-plan-maestro.md` y las fases `f0`…`f6`.

### 1.4 Commit inicial del ciclo
```bash
git add .
git commit -m "docs(06): plan maestro ecosistema financiero simulado S/4HANA"
git push -u origin feature/financial-eco
```

---

## 2. Criterios de aceptación

- [ ] Rama `feature/financial-eco` creada y activa, basada en `master`.
- [ ] `pnpm install` exitoso (parches OData aplicados).
- [ ] Tests en verde; número anotado como baseline.
- [ ] `master` sin cambios (todo el trabajo queda en la rama).
- [ ] Docs del ciclo 06 iniciadas.

---

## 3. Siguiente fase

➡️ [`f1-modelos-financieros.md`](f1-modelos-financieros.md)
