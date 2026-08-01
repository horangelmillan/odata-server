# 17 — Plantilla de Ciclo: cómo se crea y ejecuta una iniciativa

> **Propósito:** codificar el proceso canónico que siguen los ciclos 05–15 de este
> proyecto, para que cualquier iniciativa nueva (solución de problemas, mejoras,
> hallazgos, deuda, refactorización) se estructure igual. Creada en el ciclo 16 (F0)
> como decisión D8; el propio ciclo 16 es su primera implementación de referencia.

---

## 1. Cuándo se crea un ciclo

Un **ciclo** es la unidad de iniciativa de este repositorio. Se crea cuando hay que
resolver uno o más problemas relacionados, aplicando siempre el principio de **mínima
modificación** y el flujo Git obligatorio (PR único mecanismo de integración).

Se nombra `docs/NN-nombre-corto/` con `NN` = siguiente número correlativo tras revisar
`docs/00-indice.md`.

---

## 2. Estructura de la carpeta del ciclo

```
docs/NN-nombre-corto/
├── 00-plan-maestro.md          # Contrato global: contexto, decisiones, fases, aceptación
├── 01-arquitectura-propuesta.md # OBLIGATORIO si el ciclo introduce decisiones de arquitectura
├── 02-implementation-backlog.md # Única fuente de hallazgos/tareas del ciclo (obligatorio)
└── fases/
    ├── f0-ramificacion-y-plan.md
    ├── f1-....md
    └── ...
```

### 2.1 `00-plan-maestro.md`

Contiene, en orden:

1. **Cabecera**: ciclo, inicio, estado global, baseline verificado (build, suite, type-check, working tree, master al día, issues/PRs).
2. **0. Contexto y origen**: por qué existe el ciclo, evidencia de los problemas (medida, archivo, línea).
3. **1. Decisiones de arquitectura** (tabla `D# | Decisión | Alternativas descartadas`). Toda decisión que afecte estructura, entorno o proceso se registra aquí.
4. **2. Fases** (tabla `Fase | Contenido | Entregable | Criterio de aceptación`).
5. **3. Criterios de aceptación globales** (checklist `[ ]` del ciclo completo).
6. **4. Flujo Git** (rama, continuidad de fases sobre la misma rama mientras el PR esté abierto — GIT_WORKFLOW §12 —, PR como único mecanismo).
7. **5. Resultado de la ejecución** (se completa al cierre, fase por fase, con evidencia).

### 2.2 `02-implementation-backlog.md`

Única fuente de verdad de hallazgos del ciclo. Todo hallazgo detectado se clasifica en
una de estas categorías (AGENTS.md):

| Categoría | Prefijo | Ejemplo |
|---|---|---|
| Riesgo | `R#` | `R1 | pnpm start roto | Alta | ...` |
| Mejora | `M#` | `M1 | /healthz | ...` |
| Refactorización | `RF#` | `RF1 | common importa core | ...` |
| Deuda Técnica | `DT#` | `DT1 | deps huérfanas | ...` |
| Investigación Futura | `IF#` | `IF1 | observabilidad externa | ...` |
| Decisión Arquitectónica Pendiente | `DA#` | `DA1 | endpoints públicos en prod | ...` |

Columnas mínimas: `ID | Hallazgo | Detalle/evidencia | Impacto | Estado | Fase/Resolución`.

**Estados válidos:** `Pendiente` · `En evaluación` · `Implementado` · `Descartado` ·
`Movido a iniciativa futura` · `Superseded` (superado con nota).

**Regla de cierre:** un ciclo no termina con elementos `Pendiente`/`En evaluación`;
cada uno debe quedar en `Implementado`, `Descartado`, `Movido a iniciativa futura` o
`Superseded` con justificación. Los `IF`/`DA` diferidos se registran como "Movido a
iniciativa futura" (o se reabren con desencadenante concreto, no por defecto).

### 2.3 `fases/*.md`

Una fase por archivo, **autónoma y ejecutable en una sesión**. Cada fase contiene:

1. **Objetivo** y alcance.
2. **Pasos detallados** (con comandos cuando aplique).
3. **Checklist de seguimiento** (`- [ ]` por ítem) — el avance se marca con `[x]` o `[~]`
   (superseded con nota) **al completarse**, nunca antes.
4. **Gate de la fase**: validaciones obligatorias ANTES de pasar a la siguiente fase.
5. **Hallazgos detectados**: todo hallazgo se registra en el backlog con su clasificación
   y la decisión: ¿se resuelve en esta fase o se difiere? (con justificación).
6. **Resultado** (se completa al cerrar la fase).

**Regla de oro:** no se avanza a la siguiente fase/tarea sin verificar que los cambios
de la actual resuelven el problema y no rompen nada (gate en verde).

---

## 3. Flujo de ejecución (checklist de creación)

1. **Revisar el Implementation Backlog del ciclo anterior** — los elementos `Movido a
   iniciativa futura`/`Pendiente` cuyo alcance pertenezca al nuevo ciclo se incorporan
   explícitamente al plan.
2. **Git (GIT_WORKFLOW):** master actualizado → rama nueva desde master → nunca desde
   otra rama. Estado limpio antes de crear la rama.
3. **F0 — Ramificación y plan:** crear la plantilla de ciclo si no existe (o revisarla),
   el plan maestro, el backlog con los hallazgos iniciales y el registro en
   `docs/00-indice.md`. Gate F0: baseline en verde (build + suite + type-check).
4. **Fases F1…Fn:** implementar con checklist por fase; al terminar cada fase:
   - actualizar la documentación de la fase (`fases/*.md`, `00-plan-maestro.md`);
   - actualizar el Implementation Backlog (clasificar nuevos hallazgos, cambiar estados);
   - ejecutar el gate de la fase en verde.
5. **F-cierre (validación integral):** build, type-check de tests, suite completa,
   smoke del runtime real, Playwright si interviene UI, determinismo de seed si aplica.
6. **Cierre documental:** revisión completa del backlog (sin Pendiente/En evaluación),
   índice actualizado, README/checklist/arquitectura si procede, bump de versión si el
   ciclo lo amerita (registrar la decisión).
7. **PR a `master`** con CI verde (único mecanismo de integración) y merge.

---

## 4. Referencias

- `docs/07-workflow/GIT_WORKFLOW.md` — flujo Git obligatorio (rama, PR, §12 continuidad).
- `AGENTS.md` — reglas del proyecto (backlog obligatorio, hallazgos, prioridad de instrucciones).
- `docs/00-indice.md` — registro de todos los ciclos y su estado real.
- Ciclo de referencia: `docs/15-consolidacion/` (estructura + cierre documental) y el
  propio `docs/16-produccion-segura/` (primera implementación de esta plantilla).
