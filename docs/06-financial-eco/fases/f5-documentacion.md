# F5 — Documentación del ecosistema financiero

> **Fase:** F5 · **Esfuerzo:** Medio · **Sesión:** 21/N
> **Depende de:** F4.
> **Actualiza:** `docs/02-patrones/11-example-module-product.md` (o nuevo `16-financial-module.md`),
> `README.md`, `AGENTS.md`, `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Documentar el ecosistema financiero para que el backend orquestador/LLM y futuros mantenedores
entiendan el contrato OData: entidades, navegaciones, estados y cómo re-montar los datos.

---

## 1. Pasos

### 1.1 Patrón de módulo financiero
Añadir `docs/02-patrones/16-financial-module.md`: diagrama de entidades, FK lógicas, ejemplos de
`$expand`/`$filter` para el chatbot, y el flujo de clearing (pago → factura).

### 1.2 `README.md`
Sección "Ecosistema financiero simulado S/4HANA": cómo levantar (`docker compose up -d db`,
`pnpm dev`, `pnpm db:reset`), qué dominios existen, y que es re-montable.

### 1.3 `AGENTS.md`
Nota de que `core/<dominio financiero>/` sigue el domain layer OData-first; el seed vive en
`scripts/seed/` y es idempotente.

### 1.4 `docs/00-indice.md`
Añadir entrada `06-financial-eco` con enlace al plan maestro y estado de fases.

---

## 2. Criterios de aceptación

- [ ] `docs/02-patrones/16-financial-module.md` creado.
- [ ] `README.md` y `AGENTS.md` mencionan el ecosistema y el seed re-montable.
- [ ] `docs/00-indice.md` enlista el ciclo 06.

---

## 3. Siguiente fase

➡️ [`f6-merge-a-master.md`](f6-merge-a-master.md)
