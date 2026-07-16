# F5 — Documentación completa

> **Fase:** F5 · **Esfuerzo:** Medio · **Sesión:** 6/8
> **Depende de:** F1–F4 (código ya reubicado).
> **Actualiza:** `README.md`, `AGENTS.md`, `docs/00-indice.md`, `docs/02-patrones/05-odata-module-pattern.md`,
> `docs/02-patrones/11-example-module-product.md`, `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md`,
> `historia-04-*.md`, `historia-06-*.md`, este archivo.

---

## 0. Objetivo

Dejar toda la documentación coherente con el nuevo diseño **OData-as-domain**. Lo que antes
decía "REST para escritura / OData para lectura (CQRS ligero)" ahora dice "OData es el dominio
único; REST eliminado". Los docs `04` y `06` originales se conservan como **historia** (en esta
misma carpeta) para trazabilidad de por qué se tomó la decisión.

---

## 1. Documentos a reescribir

### 1.1 `README.md`
- Stack: quitar "ORM (REST) Sequelize" como capa de escritura; decir "ORM: `@phrasecode/odata`
  (fuente de verdad, define tablas vía DataSource)". Mantener Sequelize como motor interno del
  DataSource (transparente).
- Arquitectura: reemplazar el árbol por el objetivo de `00-plan-maestro.md §3`. Eliminar
  `route/`, `controller/` REST; mostrar `core/<dominio>/` con `interface/model/dto/service/controller`.
- Principios: eliminar "REST para escritura / OData para lectura". Nuevo principio: "OData es el
  dominio; DTO + validación en escritura; shared kernel en `common/service/odata/`".
- API: eliminar tabla REST; dejar solo `/odata` (colección, `:id`, `$count`, `$metadata`, `$batch`,
  escritura directa, etag, errores).
- "Cómo agregar un módulo": reescribir para OData-first (model `@Table/@Column` en `core/`,
  controller `ODataControler`, service DTO-validado, registro en `odata.service.ts`).

### 1.2 `AGENTS.md` (raíz del proyecto)
- Convenciones: los endpoints OData van en `/odata/<entidad>` (ya). Añadir: "Los dominios OData
  viven en `src/core/<dominio>/` con interface/model/dto/service/controller; `src/common/service/odata/`
  es shared kernel (infra), no dominio."
- Quitar referencia a "REST en core" / "OData en common como servicio compartido".

### 1.3 `docs/00-indice.md`
- Marco F0–F4 como done; F5 en progreso.

### 1.4 `docs/02-patrones/05-odata-module-pattern.md`
- "Module Structure": modelos/controladores en `core/<dominio>/`; `common/service/odata/` = shared kernel.
- Paso a paso: crear modelo en `core/product/model/`, controller en `core/product/controller/`,
  service DTO-validado, registrar en `odata.service.ts`.

### 1.5 `docs/02-patrones/11-example-module-product.md`
- Ejemplo completo OData-first (sin REST). Mostrar `IProduct`, modelo `@Table/@Column`, DTOs,
  service con validación, controller `ODataControler` con escritura, registro.

### 1.6 `docs/04-sapui5-compat/14-sapui5-compatibility-plan.md`
- Añadir nota de cierre: la deuda de arquitectura (Sesión 11) se resolvió en el ciclo
  `refactor/odata-as-domain` (ver `docs/05-refactor-odata-as-domain/00-plan-maestro.md`).
  Enlazar el plan maestro.

### 1.7 `historia-04-*.md` y `historia-06-*.md` (esta carpeta)
- Encabezar con un callout: "DOCUMENTO HISTÓRICO — describe el diseño previo (OData en Shared
  Kernel + REST en core). Revocado por el ciclo `refactor/odata-as-domain` (ver `00-plan-maestro.md`)."

---

## 2. Criterios de aceptación

- [ ] `README.md` sin referencias a REST como protocolo de escritura; árbol de arquitectura nuevo.
- [ ] `AGENTS.md` refleja OData-as-domain.
- [ ] `05-odata-module-pattern.md` y `11-example-module-product.md` OData-first.
- [ ] `14-sapui5-compatibility-plan.md` enlaza la resolución de la deuda.
- [ ] `historia-04/06` marcados como históricos.
- [ ] `docs/00-indice.md` actualizado.

---

## 3. Siguiente fase

➡️ [`f6-validacion-e2e-benchmark.md`](f6-validacion-e2e-benchmark.md)
