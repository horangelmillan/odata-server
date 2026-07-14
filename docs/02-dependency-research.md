# 02 — Investigación de Dependencias

## 2.1 Librerías OData v4 para Node.js

Se evaluaron tres librerías principales para implementar un servidor OData v4 en Node.js/TypeScript. A continuación se presenta la matriz comparativa:

| Feature | `odata-v4-server` (v0.2.13) | `ts-odata-v4-server` (fork) | `@phrasecode/odata` (v0.3.1) |
|---------|------------------------------|------------------------------|-------------------------------|
| Last update | Jul 2018 | 2022 | **Dec 2025** |
| TypeScript target | TS 2.9 | TS 4.x | **TS 5.x** |
| PostgreSQL | ❌ (solo MySQL) | ❌ (solo MySQL) | **✅ Nativo** |
| Auto $metadata | ❌ (archivo XML) | ❌ (archivo XML) | **✅ Automático** |
| $expand anidado | Limitado | 1 nivel | **5+ niveles** |
| Express middleware | ✅ (`.create()`) | ✅ | **✅ (ExpressRouter)** |
| CRUD completo | ✅ | ✅ | **✅ Configurable** |
| Custom queries | ❌ | ❌ | **✅ @Query decorator** |
| CORS integrado | ✅ (`@odata.cors`) | ✅ | **✅ Configurable** |
| Dependencias | 16 (muchas antiguas) | 15 | **3 (modernas)** |
| Weekly downloads | 518 | <100 | Nueva (creciendo) |
| Mantenimiento | **Abandonado** | Bajo | **Activo** |

### Análisis detallado

**`odata-v4-server` v0.2.13**: Es la librería utilizada en el proyecto referencia. Aunque funcional, su última actualización data de 2018, lo que supone un riesgo de seguridad y compatibilidad. Depende de 16 paquetes, muchos de ellos con versiones obsoletas que arrastran vulnerabilidades conocidas. No soporta PostgreSQL, lo que bloquea cualquier migración de base de datos. La generación de `$metadata` requiere un archivo XML manual, un proceso propenso a errores y difícil de mantener.

**`ts-odata-v4-server`**: Fork comunitario del anterior con actualizaciones hasta 2022. Migra a TypeScript 4.x y resuelve algunos bugs menores, pero mantiene las mismas limitaciones arquitectónicas: solo MySQL, sin `$metadata` automático, y dependencias aún desactualizadas. La comunidad es muy pequeña (<100 descargas semanales), lo que compromete el soporte a largo plazo.

**`@phrasecode/odata` v0.3.1**: Librería moderna con soporte TypeScript 5.x nativo y PostgreSQL como ciudadano de primera clase. Genera automáticamente el documento `$metadata` a partir de decoradores en las entidades — funcionalidad crítica para la integración con SAPUI5, que requiere el `$metadata` para generar los modelos de datos del cliente. Ofrece `$expand` anidado hasta 5 niveles (vs. 1 nivel en las alternativas). Su superficie de dependencias es mínima (3 paquetes), reduciendo la cadena de suministro de vulnerabilidades. El decorador `@Query` permite implementar lógica de consulta personalizada sin romper el pipeline OData.

## 2.2 Decisión: @phrasecode/odata

Se selecciona **`@phrasecode/odata` v0.3.1** como la librería OData v4 para el proyecto, por los siguientes motivos:

1. **Tipo TypeScript nativo**: Integración fluida con el código existente sin necesidad de puentes de tipos.
2. **Soporte PostgreSQL nativo**: Elimina la dependencia de MySQL2 y del pool duplicado que existía en el proyecto referencia.
3. **Generación automática de $metadata**: Crítico para SAPUI5. Elimina la necesidad de mantener un archivo XML manual sincronizado con las entidades.
4. **ExpressRouter integration directa**: Se monta como un router Express estándar, sin necesidad de adaptadores ni wrappers.
5. **Menor superficie de dependencias**: 3 dependencias frente a 16 de `odata-v4-server`. Menor riesgo de seguridad y menor peso en `node_modules`.
6. **Comunidad activa**: Actualizaciones recientes (diciembre 2025) y tendencia de crecimiento.

## 2.3 Dependencias de Seguridad

| Middleware | Versión | Propósito | Estado |
|-----------|---------|-----------|--------|
| **helmet** | v8.x | 13 headers HTTP de seguridad (CSP, HSTS, X-Frame-Options, etc.) | ✅ Óptimo |
| **morgan** | v1.10 | Logging HTTP en formato dev (desarrollo) y combined (producción) | ✅ Óptimo |
| **compression** | v1.7 | Compresión gzip/brotli de respuestas HTTP | ✅ Óptimo |
| **cors** | v2.8 | Configuración de Cross-Origin Resource Sharing | ✅ Óptimo |

**Justificación**: Todas estas dependencias son mantenidas activamente por sus respectivos equipos, son estándar de la industria Express, y no existen alternativas superiores que justifiquen un cambio. `helmet` es particularmente importante porque en el proyecto referencia estaba comentado, dejando la API expuesta a ataques como clickjacking y MIME sniffing.

## 2.4 Otras Dependencias

| Dependencia | Versión | Propósito |
|------------|---------|-----------|
| sequelize | v6.37+ | ORM multi-dialecto para operaciones REST |
| pg + pg-hstore | v16 | Driver PostgreSQL nativo para Sequelize |
| class-validator | v0.14 | Validación declarativa de DTOs mediante decoradores |
| class-transformer | v0.5 | Transformación de DTOs (plano a clase y viceversa) |
| class-transformer-validator | v0.9 | Bridge entre class-validator y class-transformer |
| bcrypt | v5.1 | Hash seguro de contraseñas (basado en Blowfish) |
| jsonwebtoken | v9.0 | Creación y verificación de tokens JWT |
| dotenv | v16 | Carga de variables de entorno desde `.env` |
| reflect-metadata | v0.2 | Metadata para decorators (requerido por class-validator y @phrasecode/odata) |
| http-status-codes | v2.3 | Enumeraciones tipadas de códigos HTTP |

## 2.5 Dependencias Dev

| Dependencia | Propósito |
|-------------|-----------|
| ts-node | Ejecución directa de TypeScript en entorno de desarrollo |
| typescript | Compilador de TypeScript a JavaScript |
| @types/\* | Definiciones de tipos para las dependencias sin tipos nativos |
