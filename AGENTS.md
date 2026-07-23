# odata-server — Reglas del proyecto

## Prioridad de instrucciones

Este archivo define las reglas específicas de este proyecto.

Además de este archivo, el agente debe respetar:

1. `~/.config/opencode/AGENTS.md` (reglas globales)
2. Este `AGENTS.md` (reglas del proyecto)
3. La documentación técnica ubicada en `./docs`
4. El código existente

En caso de conflicto:

**Proyecto > Global > Conocimiento general del modelo**

---

# Objetivo principal

Antes de escribir código, el agente debe comprender cómo está construido el proyecto.

La prioridad siempre será:

* reutilizar
* mantener consistencia
* evitar duplicar arquitectura
* respetar decisiones existentes

Nunca implementar una solución nueva sin verificar primero si ya existe una forma establecida dentro del proyecto.

---



---

# Flujo obligatorio antes de cualquier cambio

## 0. Flujo de trabajo con Git (Obligatorio)

Todo cambio en el repositorio debe seguir estrictamente el flujo definido en:

`docs\07-workflow\GIT_WORKFLOW.md`

Este documento es la única fuente de verdad sobre el proceso de desarrollo con Git.

Antes de realizar cualquier operación relacionada con ramas, commits, merges, rebases, pull requests o sincronización del repositorio, el agente debe leer y respetar dicho documento.

Está prohibido asumir un flujo de trabajo diferente al definido allí.

Si alguna tarea entra en conflicto con las reglas establecidas en `GIT_WORKFLOW.md`, el agente debe detenerse y solicitar instrucciones al usuario en lugar de improvisar una estrategia alternativa.

El agente nunca debe modificar la estrategia de versionado por iniciativa propia.

Antes de modificar cualquier archivo, SIEMPRE seguir este orden.

## 1. Revisar documentación

La carpeta:

```
./docs
```

es la fuente de verdad sobre la evolución del proyecto.

Contiene:

* arquitectura
* decisiones técnicas
* mejoras implementadas
* cambios importantes
* convenciones
* escalabilidad
* componentes
* patrones utilizados

Antes de proponer una implementación nueva, buscar primero si ya existe documentación relacionada.

No asumir.

No reinventar.

No ignorar la documentación.

---

# Gestión del Implementation Backlog

Toda iniciativa nueva debe incluir un documento llamado:

`02-implementation-backlog.md`

Este documento forma parte de la documentación obligatoria del proyecto.

## Durante cada fase

Al finalizar una fase el agente debe realizar obligatoriamente las siguientes acciones:

1. Actualizar la documentación de la fase.
2. Actualizar el Implementation Backlog.
3. Clasificar todos los nuevos hallazgos detectados.
4. Asignar un estado inicial a cada elemento registrado.

Una fase no puede considerarse finalizada hasta que ambas documentaciones hayan sido actualizadas.

## Hallazgos

Todo elemento identificado durante la implementación debe clasificarse como una de las siguientes categorías:

* Riesgo
* Mejora
* Refactorización
* Deuda Técnica
* Investigación Futura
* Decisión Arquitectónica Pendiente

No está permitido dejar observaciones únicamente dentro del informe final de una fase.

## Antes de comenzar una nueva fase

El agente debe revisar el Implementation Backlog para determinar si existen elementos cuya resolución pertenezca al alcance de la siguiente fase.

Si alguno aplica, deberá incorporarlo explícitamente al plan de trabajo de la fase.

## Antes de cerrar la iniciativa

El agente debe revisar completamente el Implementation Backlog.

Cada elemento deberá terminar clasificado como:

* Implementado
* Descartado
* Movido a una iniciativa futura

No puede declararse una iniciativa como finalizada mientras existan elementos en estado "Pendiente" o "En evaluación".

Si durante la revisión final identifica que varios elementos pueden resolverse conjuntamente mediante una única iteración, deberá proponer una **Fase de Consolidación** antes del cierre definitivo de la iniciativa.

---

## 2. Utilizar Codebase Memory

El servidor MCP de **Codebase Memory está disponible** en el entorno.

Su uso es obligatorio antes de:

* proponer arquitectura
* modificar módulos
* refactorizar
* crear nuevas funcionalidades
* responder preguntas sobre el proyecto

Debe consultarse para recuperar:

* decisiones anteriores
* patrones utilizados
* convenciones
* implementaciones similares
* contexto histórico

No asumir información cuando pueda recuperarse desde Codebase Memory.

---

## 3. Utilizar Context7

Siempre que se trabaje con:

* librerías
* frameworks
* APIs
* SDKs
* herramientas externas

Consultar primero Context7 para obtener documentación actualizada.

No depender únicamente del conocimiento interno del modelo.

Especialmente importante para:

* Express
* TypeScript
* Vitest
* PostgreSQL
* Sequelize
* OData
* SAP
* cualquier dependencia del proyecto

---

## 4. Utilizar Playwright Testing Skill (Obligatorio)

Existe una skill dedicada para validación visual y funcional:

`playwright-testing` — disponible en `~/.config/opencode/skills/playwright-testing/SKILL.md`

Esta skill debe **cargarse explícitamente** usando la herramienta `skill` antes de
realizar cualquier validación visual con Playwright MCP. Contiene patrones,
comandos y estrategias específicas para este proyecto.

### Cuándo usarla

Cuando una tarea implique:

* verificar comportamiento visual
* validar interfaces (botones, tablas, diálogos, formularios)
* reproducir errores que solo aparecen en el navegador
* comprobar navegación entre rutas (Demo ↔ Finance ↔ listas ↔ detalles)
* inspeccionar DOM para verificar estados de controles
* validar respuestas visibles al usuario (MessageToast, MessageStrip, MessageBox)
* probar flujos CRUD completos (crear → ver en lista → editar → eliminar)
* capturar tráfico de red OData para depurar peticiones/respuestas

### Regla

Utilizar Playwright antes de concluir que algo funciona correctamente.

No asumir que una funcionalidad funciona únicamente porque el código compila
o los tests unitarios pasan. La validación visual con Playwright es obligatoria
antes de declarar una tarea como completada.

---

## 5. Utilizar GitHub MCP

El servidor MCP de **GitHub está disponible** (autenticado con PAT del usuario).

Úsalo para: crear/listar PRs, revisar checks de CI, gestionar issues, reviews y
búsqueda de código en GitHub.

Reglas:

* Respetar siempre `docs\07-workflow\GIT_WORKFLOW.md` — el PR es el único
  mecanismo válido de integración a `master`.
* Antes de crear un PR, buscar plantilla en el repo.
* Nunca cerrar issues sin `state_reason`; buscar duplicados antes de crear.

---

## 6. Skills instaladas en el entorno

Además de `playwright-testing`, el entorno dispone de:

| Skill | Cuándo cargarla |
|---|---|
| `codebase-memory` | Al usar el MCP codebase-memory (patrones de consulta del grafo). |
| `context7-mcp` | Al resolver documentación de librerías con Context7. |
| `vitest` | Al escribir, configurar o depurar tests con Vitest. |
| `sapui5` | Al trabajar en la app UI5 (`ui5-odata-demo`): vistas XML, controladores, manifest.json, binding OData v4, QUnit/OPA5. |
| `ponytail` | Solución minimalista / "lazy" / YAGNI. **Límites:** nunca simplificar validación, seguridad, manejo de errores ni el flujo Git. Si contradice este AGENTS.md, gana el proyecto. |

Guía detallada con escenarios: `docs\10-herramientas-mcp-skills\01-guia-de-uso.md`.

No instalar skills o MCP adicionales sin registrar la decisión en el backlog
de la iniciativa activa.

---

# Principio de investigación

Antes de implementar cualquier solución:

1. Revisar ./docs
2. Consultar Codebase Memory
3. Consultar Context7 si intervienen librerías externas
4. Analizar el código existente
5. Solo entonces proponer cambios

Nunca comenzar implementando directamente.

---

# Principio de mínima modificación

Modificar únicamente el código necesario.

Evitar:

* refactors innecesarios
* cambios cosméticos
* renombrados masivos
* mover archivos sin justificación
* cambios de estilo no relacionados

---

# Reutilización

Antes de crear:

* servicios
* helpers
* utilidades
* middleware
* DTOs
* modelos
* controladores

Buscar si ya existe una implementación reutilizable.

La duplicación de código debe evitarse siempre que sea posible.

---

# Arquitectura

El proyecto tiene una arquitectura definida.

Las nuevas implementaciones deben adaptarse a ella.

Nunca modificar la arquitectura existente para acomodar una solución puntual.

---

# Validación

Antes de finalizar una tarea comprobar:

* el proyecto compila
* los tests existentes siguen funcionando
* no se rompe compatibilidad
* no se introducen dependencias innecesarias
* la solución sigue las convenciones del proyecto

---

# Stack

(Node, Express, OData, PostgreSQL, etc...)

(Conservar aquí el resto de la documentación actual.)

---

# Convenciones

(Mantener las convenciones existentes.)

---

# Parches

(Mantener exactamente la información existente.)

---

# Comandos

(Mantener los comandos existentes.)
