import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModules = path.resolve(__dirname, "..", "node_modules");
const expressRouterPath = path.resolve(
    nodeModules,
    "@phrasecode",
    "odata",
    "dist",
    "routers",
    "expressRouter.js",
);

function patchFile(relativePath, label, original, patched) {
    const targetPath = path.resolve(nodeModules, relativePath);
    if (!fs.existsSync(targetPath)) {
        console.log(`[odata-server] ${label}: archivo no encontrado, saltando`);
        return false;
    }
    const content = fs.readFileSync(targetPath, "utf-8");
    if (content.includes(patched)) {
        console.log(`[odata-server] ${label}: parche ya aplicado`);
        return true;
    }
    if (!content.includes(original)) {
        console.log(`[odata-server] ${label}: el archivo ha cambiado, verificar`);
        return false;
    }
    const result = content.replace(original, patched);
    fs.writeFileSync(targetPath, result, "utf-8");
    console.log(`[odata-server] ${label}: parche aplicado correctamente`);
    return true;
}

// Localiza el cierre '}' de un método, ignorando llaves dentro de strings,
// template literals y comentarios, para poder reemplazar el método completo
// aunque el archivo ya venga parcheado (versión anterior).
function findMethodEnd(content, sigStart) {
    const open = content.indexOf("{", sigStart);
    if (open === -1) return -1;
    let depth = 0;
    let inSingle = false, inDouble = false, inTemplate = false, inLine = false, inBlock = false;
    for (let i = open; i < content.length; i++) {
        const ch = content[i];
        const prev = i > 0 ? content[i - 1] : "";
        if (inLine) { if (ch === "\n") inLine = false; continue; }
        if (inBlock) { if (ch === "*" && content[i + 1] === "/") { inBlock = false; i++; } continue; }
        if (inTemplate) { if (ch === "`" && prev !== "\\") inTemplate = false; continue; }
        if (inSingle) { if (ch === "'" && prev !== "\\") inSingle = false; continue; }
        if (inDouble) { if (ch === '"' && prev !== "\\") inDouble = false; continue; }
        if (ch === "/" && content[i + 1] === "/") { inLine = true; continue; }
        if (ch === "/" && content[i + 1] === "*") { inBlock = true; i++; continue; }
        if (ch === "`") { inTemplate = true; continue; }
        if (ch === "'") { inSingle = true; continue; }
        if (ch === '"') { inDouble = true; continue; }
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) return i; }
    }
    return -1;
}

// Reemplaza el método completo setUpODataRouters sin importar si está en su
// versión limpia o ya parcheada. El marcador evita reescrituras innecesarias
// cuando ya tiene la última versión.
function patchMethod(relativePath, label, signature, patched, marker) {
    const targetPath = path.resolve(nodeModules, relativePath);
    if (!fs.existsSync(targetPath)) {
        console.log(`[odata-server] ${label}: archivo no encontrado, saltando`);
        return false;
    }
    const content = fs.readFileSync(targetPath, "utf-8");
    if (content.includes(marker)) {
        console.log(`[odata-server] ${label}: parche ya aplicado (última versión)`);
        return true;
    }
    const sigStart = content.indexOf(signature);
    if (sigStart === -1) {
        console.log(`[odata-server] ${label}: no se encontró '${signature.trim()}', verificar`);
        return false;
    }
    const end = findMethodEnd(content, sigStart);
    if (end === -1) {
        console.log(`[odata-server] ${label}: no se pudo localizar el cierre del método, verificar`);
        return false;
    }
    const result = content.slice(0, sigStart) + patched + content.slice(end + 1);
    fs.writeFileSync(targetPath, result, "utf-8");
    console.log(`[odata-server] ${label}: parche aplicado correctamente`);
    return true;
}

// Parche 1: SSL en SequelizerAdaptor (no forzar dialectOptions.ssl en dev)
patchFile(
    path.join("@phrasecode", "odata", "dist", "adaptors", "sequelizer.js"),
    "SSL SequelizerAdaptor",
    [
        "            dialectOptions: {",
        "                ssl: {",
        "                    require: dbConfig.dialectOptions?.ssl?.require,",
        "                    rejectUnauthorized: dbConfig.dialectOptions?.ssl?.rejectUnauthorized,",
        "                },",
        "            },",
    ].join("\n"),
    [
        "            dialectOptions: dbConfig.ssl ? {",
        "                ssl: {",
        "                    require: dbConfig.dialectOptions?.ssl?.require,",
        "                    rejectUnauthorized: dbConfig.dialectOptions?.ssl?.rejectUnauthorized,",
        "                },",
        "            } : {},",
    ].join("\n"),
);

// Parche 2: Ruta /$count + ruta por key en ExpressRouter (GET /:id para entidad individual).
// Se reemplaza el método setUpODataRouters completo. El marcador PATCHED-COUNT-v2
// permite reaplicar el parche aunque el archivo ya venga parcheado (p.ej. al
// reconstruir la imagen Docker o tras actualizar el parche).
const COUNT_PATCH_MARKER = "// PATCHED-COUNT-v3";
const countSignature = "    setUpODataRouters(router, controller) {";
const patchedMethod = `    setUpODataRouters(router, controller) {
        ${COUNT_PATCH_MARKER}
        const allowedMethods = controller.getAllowedMethod();
        const model = controller.getBaseModel();
        allowedMethods.forEach((method) => {
            if (method === 'get') {
                router.get('/', async (req, res) => {
                    try {
                        const perfLogger = new perfLogger_1.PerfLogger();
                        perfLogger.start();
                        const _full = \`\${req.baseUrl}\${req.url}\`;
                        const _qi = _full.indexOf('?');
                        const _decoded = _qi >= 0 ? _full.substring(0, _qi) + '?' + decodeURIComponent(_full.substring(_qi + 1)) : _full;
                        const queryParser = new query_1.QueryParser(_decoded, model, this.config.queryOptions);
                        const responce = await controller.get(queryParser);
                        const executionTime = perfLogger.end();
                        responce.meta.totalExecutionTime = executionTime;
                        res.send(responce);
                    }
                    catch (error) {
                        logger_1.Logger.getLogger().error('Error processing request', error);
                        if (error instanceof error_management_1.AppError) {
                            res.status(error.statusCode).json({
                                error: error.message,
                                code: error.code,
                                details: error.details,
                            });
                        }
                        else {
                            res
                                .status(constant_1.STATUS_CODES.INTERNAL_SERVER_ERROR)
                                .json({ error: 'Internal Server Error' });
                        }
                    }
                });
                // NOTE: \\\\$ so JS yields \\$ which path-to-regexp treats as literal $
                router.get('/\\\\$count', async (req, res) => {
                    try {
                        const perfLogger = new perfLogger_1.PerfLogger();
                        perfLogger.start();
                        const queryIdx = req.url.indexOf('?');
                        const qs = queryIdx >= 0 ? decodeURIComponent(req.url.substring(queryIdx + 1)) : '';
                        const params = new URLSearchParams(qs);
                        params.set('$count', 'true');
                        const countUrl = req.baseUrl + '/?' + params.toString();
                        const queryParser = new query_1.QueryParser(countUrl, model, this.config.queryOptions);
                        const responce = await controller.get(queryParser);
                        const executionTime = perfLogger.end();
                        const count = responce['@odata.count'] ?? 0;
                        res.set('Content-Type', 'text/plain');
                        res.send(String(count));
                    }
                    catch (error) {
                        logger_1.Logger.getLogger().error('Error processing request', error);
                        if (error instanceof error_management_1.AppError) {
                            res.status(error.statusCode).json({
                                error: error.message,
                                code: error.code,
                                details: error.details,
                            });
                        }
                        else {
                            res
                                .status(constant_1.STATUS_CODES.INTERNAL_SERVER_ERROR)
                                .json({ error: 'Internal Server Error' });
                        }
                    }
                });
                router.get('/:id', async (req, res) => {
                    try {
                        const perfLogger = new perfLogger_1.PerfLogger();
                        perfLogger.start();
                        let pkName = 'id';
                        try {
                            const meta = model.getMetadata();
                            if (meta && meta.columnMetadata) {
                                const pk = meta.columnMetadata.find(c => c.isPrimaryKey);
                                if (pk) pkName = pk.propertyKey;
                            }
                        } catch (_) {}
                        const pkValue = req.params.id;
                        const keyParams = new URLSearchParams();
                        keyParams.set('$filter', pkName + ' eq ' + pkValue);
                        const filterUrl = req.baseUrl + '/?' + keyParams.toString();
                        const queryParser = new query_1.QueryParser(filterUrl, model, this.config.queryOptions);
                        const responce = await controller.get(queryParser);
                        const executionTime = perfLogger.end();
                        if (!responce.value || responce.value.length === 0) {
                            return res.status(404).json({ error: 'Entity not found' });
                        }
                        const result = responce.value[0];
                        result['@odata.context'] = '/$metadata#' + model.getModelName() + '/$entity';
                        result.meta = { totalExecutionTime: executionTime };
                        res.send(result);
                    }
                    catch (error) {
                        logger_1.Logger.getLogger().error('Error processing request', error);
                        if (error instanceof error_management_1.AppError) {
                            res.status(error.statusCode).json({
                                error: error.message,
                                code: error.code,
                                details: error.details,
                            });
                        }
                        else {
                            res
                                .status(constant_1.STATUS_CODES.INTERNAL_SERVER_ERROR)
                                .json({ error: 'Internal Server Error' });
                        }
                    }
                });
                return;
            }
        });
    }`;

if (fs.existsSync(expressRouterPath)) {
    patchMethod(
        path.join("@phrasecode", "odata", "dist", "routers", "expressRouter.js"),
        "Key-access ExpressRouter",
        countSignature,
        patchedMethod,
        COUNT_PATCH_MARKER,
    );
} else {
    console.log("[odata-server] Key-access ExpressRouter: archivo no encontrado, saltando");
}
