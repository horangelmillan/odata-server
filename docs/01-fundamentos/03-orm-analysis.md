# 03 — Análisis de ORMs

## 3.1 Criterios de Evaluación

La selección del ORM se basa en los siguientes criterios, ponderados según las necesidades del proyecto:

1. **TypeScript support** — Capacidad de inferir tipos automáticamente desde el esquema de la base de datos.
2. **PostgreSQL support** — Soporte nativo del ORM para PostgreSQL como dialecto de primera clase.
3. **DB-agnostic (multi-dialecto)** — Capacidad de cambiar de base de datos sin modificar el código de la capa de acceso a datos.
4. **Compatibilidad con @phrasecode/odata** — Capacidad de integrarse con la librería OData seleccionada sin adaptadores complejos.
5. **Migraciones** — Sistema de migraciones de esquema de base de datos integrado o mediante herramienta complementaria.
6. **Rendimiento** — Velocidad de ejecución de consultas comparada con benchmarks de la industria.
7. **Comunidad / Madurez** — Tamaño de la comunidad, frecuencia de actualizaciones, disponibilidad de recursos de aprendizaje.
8. **Compatibilidad con node-modular-monolith** — Facilidad de integración con el patrón arquitectónico definido en la skill de referencia.

## 3.2 Matriz de Decisión

| Criterio | Sequelize v6/v7 | Drizzle ORM | Prisma |
|----------|----------------|-------------|--------|
| TypeScript | ⚠️ Segundo-class | ✅ **Nativo** | ✅ Nativo |
| PostgreSQL | ✅ Excelente | ✅ Excelente | ✅ Excelente |
| DB-agnostic | ✅ 6+ dialectos | ⚠️ 3 dialectos | ✅ 5+ dialectos |
| Compatible @phrasecode/odata | ✅ **Sí (nativo)** | ❌ No | ❌ No |
| Migraciones | ✅ (umzug) | ✅ (drizzle-kit) | ✅ (prisma migrate) |
| Rendimiento | ⚠️ Medio | ✅ **Alto** | ⚠️ Medio |
| Peso | ⚠️ Pesado | ✅ Ligero | ⚠️ Pesado |
| Compatible node-modular-monolith | ✅ **Sí** | ⚠️ Requiere adaptación | ⚠️ Requiere adaptación |
| Curva de aprendizaje | ⚠️ Media | ✅ Baja | ✅ Baja |
| Madurez | ✅ Alta (10+ años) | ⚠️ Media (3 años) | ✅ Alta (6+ años) |

### Análisis detallado

**Sequelize v6/v7**: Es el ORM más maduro del ecosistema Node.js con más de 10 años de desarrollo activo. Soporta 6 dialectos de base de datos (PostgreSQL, MySQL, MariaDB, SQLite, MSSQL, Oracle), lo que proporciona el máximo agnosticismo. Su modelo de definición basado en decoradores (`@Table`, `@Column`) es compatible con `@phrasecode/odata`, que puede leer el esquema directamente desde las entidades Sequelize. La integración es nativa: `@phrasecode/odata` puede generar el `$metadata` a partir de los modelos Sequelize sin configuración adicional. El principal punto débil es que TypeScript no es nativo; aunque v7 introduce mejoras significativas, v6 requiere la declaración manual de interfaces y el uso de `InferAttributes` para obtener tipos parciales.

**Drizzle ORM**: ORM moderno con enfoque "type-safe first". Ofrece el mejor rendimiento en benchmarks gracias a su generación de SQL directo sin overhead de caché de objetos. Su sintaxis es cercana al SQL, lo que reduce la curva de aprendizaje. Sin embargo, su compatibilidad con `@phrasecode/odata` es nula: no existe un adaptador oficial ni comunitario. Drizzle está diseñado para ser usado directamente, no como capa subyacente de otro framework. Además, solo soporta 3 dialectos (PostgreSQL, MySQL, SQLite), lo que limita la flexibilidad futura.

**Prisma**: ORM con enfoque declarativo basado en un archivo de esquema (`schema.prisma`). Ofrece TypeScript nativo y un cliente generado con tipos completos. Su sistema de migraciones es robusto. Sin embargo, al igual que Drizzle, no es compatible con `@phrasecode/odata`. Prisma no puede ser utilizado como capa subyacente porque no expone un modelo de datos que otro framework pueda inspeccionar en tiempo de ejecución — el esquema se procesa en tiempo de compilación. Además, Prisma añade un binary engine (~30MB) que aumenta el peso del proyecto y complica el despliegue en entornos serverless o contenedores minimalistas.

## 3.3 Decisión: Sequelize v6/v7

Se selecciona **Sequelize v6** como ORM para odata-server.

**Motivos principales:**
1. **Compatibilidad nativa con `@phrasecode/odata`**: `@phrasecode/odata` puede inspeccionar los modelos Sequelize en tiempo de ejecución para generar el `$metadata` automáticamente. Esto elimina la necesidad de definir modelos OData duplicados.
2. **Alineación con node-modular-monolith**: Los templates de referencia de la skill utilizan Sequelize como ORM por defecto.
3. **Máximo agnosticismo**: Con soporte para 6 dialectos, Sequelize proporciona la máxima flexibilidad para cambiar de base de datos sin modificar el código de negocio.
4. **Madurez probada**: Sequelize lleva más de una década en producción. La mayoría de los bugs y edge cases están documentados y resueltos.
5. **Modelo de datos unificado**: Un solo conjunto de modelos sirve tanto para REST como para OData, eliminando la duplicación de esquemas.

**Concesiones:**
- TypeScript no es nativo (requiere `InferAttributes`, declaración manual de interfaces).
- Rendimiento menor que Drizzle en benchmarks de operaciones masivas.
- API verbosa comparada con alternativas modernas.
- Mayor peso en `node_modules`.

## 3.4 Sequelize v7 vs v6

**v7**: Introduce TypeScript nativo (finalmente), ESM como módulo por defecto, y mejoras en el tipado del query builder. Sin embargo, aún no es estable en el ecosistema de `@phrasecode/odata` y algunos plugins/middlewares no han sido actualizados.

**v6**: Versión estable con la documentación más extensa. Es la versión probada con `@phrasecode/odata` v0.3.1.

**Decisión**: Usar Sequelize v6. Migrar a v7 cuando el ecosistema `@phrasecode/odata` lo soporte oficialmente.

## 3.5 Configuración para PostgreSQL

odata-server usa dos configuraciones de Sequelize, una para desarrollo y otra para producción, definidas en `src/common/service/ORM/sequelize.service.ts`:

```typescript
// Desarrollo
const paramsDev: Options = {
    dialect: "postgres",
    host: process.env.DEV_HOST || "localhost",
    port: Number(process.env.DEV_PORT) || 5432,
    username: process.env.DEV_USERNAME || "postgres",
    password: process.env.DEV_PASSWORD || "secret",
    database: process.env.DEV_DB || "odata_dev",
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
};

// Producción
const paramsProd: Options = {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    logging: false,
    pool: { max: 20, min: 5, acquire: 30000, idle: 10000 },
    dialectOptions: {
        ssl: { required: true, rejectUnauthorized: false },
    },
};
```

La configuración de producción habilita SSL obligatorio y usa un pool más grande (20 conexiones máx, 5 mín) para soportar mayor carga concurrente.
