# 10 — Checklist de Mejores Prácticas

## 10.1 Arquitectura
- [ ] OData solo-lectura (solo `allowedMethod: ["get"]`)
- [ ] REST para escritura (POST/PUT/DELETE en `/api/core`)
- [ ] Shared Kernel en `common/` sin acoplamiento a `core/`
- [ ] Ningún dominio importa OData
- [ ] Una sola vía de escritura por recurso

## 10.2 Modelos OData
- [ ] Modelos decorados con `@Table` + `@Column`
- [ ] Usar `@HasMany`/`@BelongsTo` para relaciones
- [ ] Apuntar a vistas SQL para optimización
- [ ] Named exports (no `export default`)
- [ ] Tipo `!` (definite assignment) en propiedades

## 10.3 Controladores OData
- [ ] Extender `ODataControler`
- [ ] `allowedMethod: ["get"]` (solo lectura)
- [ ] Límite máximo de resultados (`query.setTop(100)`)
- [ ] Custom logic via override del método `get()`
- [ ] Consultas raw con `@Query` decorator
- [ ] Manejar errores con try/catch

## 10.4 REST API (node-modular-monolith)
- [ ] Dominio en `core/<domain>/` con capas separadas
- [ ] Controller implementa `BaseController`
- [ ] Service implementa `BaseService`
- [ ] DTOs con decoradores `class-validator`
- [ ] `validateBodyWithDTO` en POST/PUT
- [ ] `try/catch → next(error)` en handlers
- [ ] Respuestas con `ApiResponse`
- [ ] Excepciones tipadas (`HttpException`)

## 10.5 Seguridad
- [ ] `helmet()` activado (no comentado)
- [ ] CSP configurado para SAPUI5
- [ ] CORS con `exposedHeaders: ["OData-Version"]`
- [ ] Morgan activo con formato adecuado
- [ ] Compression con threshold > 1KB
- [ ] JWT validation en rutas protegidas
- [ ] Passwords hasheados con bcrypt (salt rounds 12)
- [ ] Stack trace oculto en errores de producción

## 10.6 Base de Datos
- [ ] Connection pooling configurado (max 10-20)
- [ ] SSL en producción
- [ ] Migration strategy definida
- [ ] Vistas SQL para OData (prefijo `VIEW_`)
- [ ] Naming consistente: snake_case tablas
- [ ] Timestamps en modelos

## 10.7 Código
- [ ] ESM (`type: "module"`)
- [ ] Imports con `.js` (NodeNext)
- [ ] Orden imports: externo → common → local
- [ ] `PascalCase` clases, `camelCase` instancias
- [ ] `SCREAMING_SNAKE` constantes SQL
- [ ] Sin `export default` (excepto `src/main.ts`)
- [ ] Decoradores `experimentalDecorators: true`
- [ ] `strict: true` en tsconfig

## 10.8 Rendimiento
- [ ] Pool conexiones: min 2, max 10-20
- [ ] Límite `$top` máximo en OData (100-1000)
- [ ] Índices en columnas usadas en `$filter`
- [ ] `$select` para reducir payload
- [ ] Compression activo con threshold adecuado
- [ ] `skipLibCheck: true` para compilación rápida

## 10.9 Anti-Patterns a Evitar
- [ ] NO pool duplicado de BD
- [ ] NO importar core/dominios desde OData
- [ ] NO escribir desde OData
- [ ] NO mezclar idiomas en naming
- [ ] NO helmet desactivado
- [ ] NO Error genérico (usar HttpException)
- [ ] NO lógica de negocio en controlador
- [ ] NO dependencias cross-domain service→service
