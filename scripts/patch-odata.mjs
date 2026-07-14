import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetPath = path.resolve(
    __dirname,
    "..",
    "node_modules",
    "@phrasecode",
    "odata",
    "dist",
    "adaptors",
    "sequelizer.js",
);

if (!fs.existsSync(targetPath)) {
    console.log("[odata-server] @phrasecode/odata no encontrado, saltando parche SSL");
    process.exit(0);
}

const content = fs.readFileSync(targetPath, "utf-8");

const original = [
    "            dialectOptions: {",
    "                ssl: {",
    "                    require: dbConfig.dialectOptions?.ssl?.require,",
    "                    rejectUnauthorized: dbConfig.dialectOptions?.ssl?.rejectUnauthorized,",
    "                },",
    "            },",
].join("\n");

const patched = [
    "            dialectOptions: dbConfig.ssl ? {",
    "                ssl: {",
    "                    require: dbConfig.dialectOptions?.ssl?.require,",
    "                    rejectUnauthorized: dbConfig.dialectOptions?.ssl?.rejectUnauthorized,",
    "                },",
    "            } : {},",
].join("\n");

if (content.includes(patched)) {
    console.log("[odata-server] Parche SSL @phrasecode/odata ya aplicado");
    process.exit(0);
}

if (!content.includes(original)) {
    console.log(
        "[odata-server] @phrasecode/odata ha cambiado, el parche SSL puede no ser necesario. Verificar.",
    );
    process.exit(0);
}

const result = content.replace(original, patched);
fs.writeFileSync(targetPath, result, "utf-8");
console.log("[odata-server] Parche SSL @phrasecode/odata aplicado correctamente");
