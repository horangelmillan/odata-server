import { createRequire } from "node:module";

// R1 (ciclo 16, F3): puente runtime hacia la build CJS de @phrasecode/odata.
// El paquete publica dos builds: dist/index.js (CJS, funcional — la resolución
// legacy de Node permite imports de directorios) y dist/index.mjs (ESM, rota:
// imports sin extensión y de directorios → ERR_UNSUPPORTED_DIR_IMPORT en Node
// ESM estricto). Nuestra app compila a ESM ("type": "module"), así que un
// `import` directo del paquete cae en index.mjs y explota en producción.
// `createRequire` fuerza la condición "require" del exports → build CJS, la
// misma que consume dev (loader ts-node) y donde viven todos los parches de
// scripts/patch-odata.mjs. Cero cambios en la librería y sin dual-package
// hazard: dev y prod ejecutan exactamente el mismo código del paquete.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const odataRuntime = require("@phrasecode/odata") as typeof import("@phrasecode/odata");

export const {
    DataSource,
    Model,
    Table,
    Column,
    DataTypes,
    BelongsTo,
    HasMany,
    ODataControler,
    QueryParser,
    ExpressRouter,
} = odataRuntime;

// Los tipos (cuando se necesiten como anotación) se importan con `import type`
// directamente de "@phrasecode/odata": los imports de solo tipo se borran en
// compilación, no tocan el runtime y evitan el conflicto value/type de
// re-exportar el mismo nombre por ambos canales (TS1362).
