# Implementation Backlog — Tooling MCP & Skills

## Propósito

Centraliza los hallazgos de la iniciativa de tooling (ciclo `docs/tooling-mcp-skills`),
según las reglas de `AGENTS.md`.

Estados válidos: Pendiente · En evaluación · Aprobado · Implementado · Descartado · Movido a una iniciativa futura.

---

# Riesgos

| ID | Detectado en | Descripción | Impacto | Estado | Resolución |
| -- | ------------ | ----------- | ------- | ------ | ---------- |
| R01 | Research | Skills de terceros se ejecutan con permisos del agente. Instalar skills no vetadas es un vector de prompt-injection. | Medio | Implementado | Solo se instalaron skills con contenido revisado línea a línea (`vitest` de Anthony Fu — generada desde vitest-dev; `sapui5` — basada en SAP-docs oficial, auditorías en verde). Regla: toda nueva skill requiere revisión de contenido + registro en backlog. |

---

# Mejoras

| ID | Detectado en | Descripción | Prioridad | Estado | Observaciones |
| -- | ------------ | ----------- | --------- | ------ | ------------- |
| M01 | Research | El `AGENTS.md` global (`~/.config/opencode/AGENTS.md`) era referenciado por el proyecto pero **no existía**. | Alta | Implementado | Creado con la tabla de reglas de MCP/skills y reglas transversales. |
| M02 | Research | El `AGENTS.md` del proyecto declaraba la skill `playwright-testing` antes de que existiera el archivo. | Media | Implementado | Skill creada en `~/.config/opencode/skills/playwright-testing/` (sesión anterior); la referencia ya es válida. |

---

# Refactorizaciones

| ID | Detectado en | Descripción | Motivo | Estado |
| -- | ------------ | ----------- | ------ | ------ |
| — | — | Sin elementos | — | — |

---

# Deuda Técnica

| ID | Detectado en | Descripción | Impacto | Estado |
| -- | ------------ | ----------- | ------- | ------ |
| — | — | Sin elementos | — | — |

---

# Investigaciones Futuras

| ID | Detectado en | Tema | Motivo | Estado |
| -- | ------------ | ---- | ------ | ------ |
| IF01 | Research | Skill `playwright-best-practices` (currents-dev, 63.7K) | Solo aporta si el proyecto crea una **suite de tests E2E Playwright** (hoy la validación es exploratoria vía MCP). Reevaluar cuando exista dicha suite | Movido a una iniciativa futura |
| IF02 | Research | API key de Context7 (Upstash) | El tier anónimo tiene rate-limit; si el uso crece, registrar cuenta y añadir header `CONTEXT7_API_KEY` en `opencode.jsonc` | Movido a una iniciativa futura |
| IF03 | Research | Suite `secondsky/sap-skills` completa (sapui5-cli, sapui5-linter, sap-fiori-tools…) | Se instaló solo `sapui5` (núcleo). Si el trabajo UI5 crece, evaluar las complementarias con la misma revisión de contenido | Movido a una iniciativa futura |

---

# Decisiones Arquitectónicas Pendientes

| ID | Tema | Motivo | Estado |
| -- | ---- | ------ | ------ |
| — | — | Sin elementos pendientes | — |

---

# Registro de Resoluciones

| Fecha | ID | Acción realizada |
| ----- | -- | ---------------- |
| 2026-07-21 | — | Research skills.sh (10+ búsquedas): playwright, github, context7, sapui5, typescript, postgres, codebase-memory, odata, vitest, code-review. |
| 2026-07-21 | — | Instaladas `vitest` (antfu/skills) y `sapui5` (secondsky/sap-skills) vía CLI oficial `npx skills add` (contenido revisado). |
| 2026-07-21 | — | Rechazadas con motivo: microsoft/playwright-cli y awesome-copilot (conflicto/solape con `playwright-testing` propia), upstash/context7 (duplica local), aradotso codebase-memory (duplica oficial), supabase/neon/prisma postgres (no-fit), code-review genéricas (flujo PR propio). |
| 2026-07-21 | M01 | `~/.config/opencode/AGENTS.md` creado. |
| 2026-07-21 | M02 | Referencia `playwright-testing` del AGENTS.md validada (skill existente). |
| 2026-07-21 | R01 | Regla de revisión de skills de terceros documentada (esta tabla + guía §4 antipatrones). |

---

# Cierre de la iniciativa

Todos los elementos en **Implementado** salvo IF01–IF03, movidos a iniciativa futura.
No quedan elementos en "Pendiente" ni "En evaluación".
