# F4 — Tests de integración del ecosistema

> **Fase:** F4 · **Esfuerzo:** Medio · **Sesión:** 20/N
> **Depende de:** F3.
> **Actualiza:** `docs/00-indice.md`, este archivo.

---

## 0. Objetivo

Cubrir con tests de integración las consultas que el backend orquestador/LLM enviará al servidor
OData, garantizando que el ecosistema responde de forma coherente y re-montable.

---

## 1. Pasos

### 1.1 Fixture de seed en tests
Los tests de integración deben poder levantar el ecosistema con `pnpm db:reset` (o un seed en
memoria) para no depender de datos manuales. Reusar `scripts/seed/financial-seed.ts`.

### 1.2 Casos (supertest contra `/odata`)
- `GET /odata/company` → 1 sociedad.
- `GET /odata/customer?$count=true` → 8.
- `GET /odata/invoice?$filter=status eq 'PENDIENTE'&$expand=customer` → solo pendientes.
- `GET /odata/invoice?$expand=items($expand=glAccount)` → navegación profunda.
- `GET /odata/payment?$filter=partnerType eq 'C'&$expand=invoice` → clearing resuelto.
- `GET /odata/$metadata` → expone las 8 entidades + navegaciones.

### 1.3 Determinismo
Al ser el seed idempotente, los asserts de conteo/importes son estables entre ejecuciones.

---

## 2. Criterios de aceptación

- [x] Tests de ecosistema en verde. *(`financial-ecosystem.integration.test.ts` en la suite — verde en cada ejecución)*
- [x] `pnpm test` global en verde (sin regresión vs baseline F0). *(Suite 192/192 PASS, ciclo 14)*
- [x] Cobertura de las queries del chatbot. *(Queries representativas resueltas vía OData — verificado en F3 y en `financial-ecosystem.integration.test.ts`)*

---

## 3. Siguiente fase

➡️ [`f5-documentacion.md`](f5-documentacion.md)
