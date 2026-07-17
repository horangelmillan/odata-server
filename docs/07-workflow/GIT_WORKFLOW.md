# Git Workflow

## Objetivo

Este proyecto utiliza un flujo de trabajo basado en ramas de desarrollo y Pull Requests.

La rama `master` es la rama de producción y está protegida en GitHub.

**Nunca debe recibir cambios directamente.**

---

# Principios

## 1. La rama `master` nunca se utiliza para desarrollar.

Está prohibido:

* realizar commits sobre `master`
* hacer push directamente a `master`
* desarrollar nuevas funcionalidades sobre `master`
* realizar merges locales hacia `master`

Toda modificación debe realizarse desde una rama nueva creada específicamente para esa tarea.

---

## 2. Toda rama nueva nace desde `master` actualizado.

Antes de comenzar cualquier desarrollo, el agente debe seguir este orden:

1. Cambiar a `master`.
2. Obtener los cambios remotos.
3. Actualizar completamente `master`.
4. Crear una **rama nueva** desde ese estado actualizado.

Nunca crear una rama desde otra rama de trabajo.

Nunca reutilizar ramas antiguas.

Nunca continuar desarrollos sobre ramas cerradas.

---

## 3. Una tarea equivale a una rama.

Cada mejora, corrección o refactorización debe utilizar una rama independiente.

Ejemplos:

* `feature/login`
* `feature/user-profile`
* `fix/decimal-parser`
* `fix/auth-timeout`
* `refactor/odata-controller`
* `docs/api-reference`

Nunca mezclar varias tareas distintas en una misma rama.

---

## 4. No reutilizar ramas existentes.

Si una rama ya fue utilizada anteriormente, debe considerarse finalizada.

Aunque siga existiendo localmente, no debe reutilizarse para nuevos desarrollos.

Cada tarea comienza con una rama completamente nueva.

---

## 5. Antes de crear una rama nueva.

El agente debe comprobar el estado del repositorio.

Si existen:

* archivos modificados
* archivos sin seguimiento
* commits pendientes
* conflictos
* operaciones Git incompletas

Debe detenerse inmediatamente y solicitar instrucciones al usuario.

Nunca debe:

* mover cambios entre ramas
* ejecutar `git stash`
* crear commits automáticos
* redistribuir archivos

sin autorización explícita del usuario.

---

## 6. Durante el desarrollo.

El agente únicamente debe modificar el código correspondiente a la tarea asignada.

Debe evitar cambios no relacionados.

No debe aprovechar una tarea para realizar refactorizaciones adicionales sin autorización.

---

## 7. Finalización del desarrollo.

Cuando la implementación esté terminada, el flujo correcto es:

1. Ejecutar las validaciones necesarias.
2. Confirmar que la solución funciona.
3. Crear los commits correspondientes.
4. Publicar la rama remota.
5. Crear un Pull Request dirigido hacia `master`.

El Pull Request representa el único mecanismo válido para integrar cambios.

---

## 8. Pull Requests.

Todo cambio destinado a `master` debe realizarse mediante Pull Request.

Nunca realizar merges directos.

Nunca cerrar el flujo mediante un merge local.

El agente debe asumir siempre que GitHub rechazará cualquier intento de modificación directa sobre `master`.

---

## 9. Operaciones avanzadas.

El agente **no debe ejecutar automáticamente** ninguna de las siguientes operaciones:

* rebase
* merge manual
* cherry-pick
* reset
* revert
* stash
* force push
* squash
* reescritura del historial

Si alguna de estas operaciones resulta necesaria, debe detenerse y solicitar instrucciones al usuario.

---

## 10. Conflictos.

Ante cualquier conflicto de Git, el agente debe detener el proceso.

Nunca debe resolver conflictos automáticamente.

Nunca debe decidir qué versión conservar.

La resolución corresponde exclusivamente al usuario.

---

## 11. Regla absoluta.

Si existe cualquier duda sobre el estado del repositorio, las ramas o el historial, el agente debe detenerse y consultar al usuario.

Es preferible interrumpir el flujo que realizar una operación Git incorrecta.

La prioridad absoluta es preservar la integridad del historial del proyecto y evitar cualquier pérdida de trabajo.
