import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModules = path.resolve(__dirname, "..", "node_modules");

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

// Parche 2: Ruta por key en ExpressRouter (GET /:id para entidad individual)
patchFile(
    path.join("@phrasecode", "odata", "dist", "routers", "expressRouter.js"),
    "Key-access ExpressRouter",
    `                });
                return;
            }
        });
    }
    setUpCustomRoutes`,
    `                });
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
                        const filterUrl = req.baseUrl + '/?' + '$filter=' + pkName + ' eq ' + pkValue;
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
    }
    setUpCustomRoutes`,
);
