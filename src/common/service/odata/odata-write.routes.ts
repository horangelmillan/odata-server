import express, { type Router, type Request, type Response } from "express";
import { ODataControler } from "@phrasecode/odata";
import { odataWriteService, type ODataBaseModel } from "./odata-write.service.js";
import { injectEtag, etagMatches } from "./odata-etag.js";
import { oDataError } from "./odata-error.js";
import { JSONValidatorException } from "../../exception/json-validator.exception.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../../../core/product/dto/product.dto.js";
import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";

async function transformAndValidateProduct<T extends object>(
    dto: ClassType<T>,
    data: unknown,
): Promise<T> {
    try {
        return (await transformAndValidate(dto, data as object, {
            validator: {
                validationError: { target: false },
                whitelist: true,
                forbidNonWhitelisted: true,
            },
        })) as T;
    } catch (error: unknown) {
        if (error instanceof Array && error.every((e) => e instanceof ValidationError)) {
            throw new JSONValidatorException(`Error validando ${dto.name}`, error);
        }
        throw error;
    }
}

// Escritura directa OData (modo groupId "$direct" de SAPUI5). Reutiliza el
// mismo write service (y por tanto la misma instancia Sequelize/pool) que el
// $batch. Cada operación corre en su propia transacción atómica.
//
// NOTA: `express.json()` sólo parsea Content-Type application/json, así que
// montarlo aquí NO consume el cuerpo multipart/mixed del `$batch`.

function modelOf(controller: ODataControler): ODataBaseModel {
    return controller.getBaseModel() as unknown as ODataBaseModel;
}

// F1: validación DTO en escritura directa OData. Reusa los DTOs del dominio
// `product` (mismos que la ruta REST) para que el POST/PATCH /odata/product-odata
// falle con 400 en formato OData v4 cuando el body es inválido.
async function validateProductBody(
    endpoint: string,
    req: Request,
    res: Response,
    isUpdate: boolean,
): Promise<Record<string, unknown> | null> {
    if (endpoint !== "product-odata") return (req.body ?? {}) as Record<string, unknown>;
    try {
        const dto = isUpdate ? ProductUpdateDTO : ProductCreateDTO;
        const validated = await transformAndValidateProduct(dto, req.body ?? {});
        return validated as unknown as Record<string, unknown>;
    } catch (error) {
        if (error instanceof JSONValidatorException) {
            const details = error
                .getErrors()
                .map((e) => `${Object.keys(e.constraints ?? {}).join(", ")}`)
                .join("; ");
            res.status(400).json(oDataError(400, "Validation failed", details || "Invalid body"));
            return null;
        }
        res.status(400).json(oDataError(400, "Validation failed", (error as Error).message));
        return null;
    }
}

export function registerWriteRoutes(router: Router, controllers: ODataControler[]): void {
    const json = express.json();

    for (const controller of controllers) {
        const endpoint = controller.getEndpoint();
        const base = `/${endpoint}`;
        const model = modelOf(controller);

        router.post(base, json, async (req: Request, res: Response) => {
            try {
                const body = await validateProductBody(endpoint, req, res, false);
                if (body === null) return;
                const result = await odataWriteService.runInTransaction((tx) =>
                    odataWriteService.create(model, body, tx),
                );
                injectEtag(result.entity);
                res.set("Location", `/odata/${endpoint}(${result.key})`);
                res.status(201).json(result.entity);
            } catch (error) {
                res.status(500).json(oDataError(500, "Error creating entity", (error as Error).message));
            }
        });

        const updateHandler = async (req: Request, res: Response): Promise<void> => {
            try {
                const body = await validateProductBody(endpoint, req, res, true);
                if (body === null) return;
                // G1: concurrencia optimista (opt-in). Solo se valida `If-Match`
                // cuando el cliente lo envía; si no, se comporta como antes
                // (compatibilidad con clientes que no usan etag).
                const ifMatch = req.headers["if-match"] ?? req.headers["if-none-match"];
                if (ifMatch !== undefined) {
                    const currentEtag = await odataWriteService.getCurrentEtag(model, req.params.id);
                    if (currentEtag === null) {
                        res.status(404).json(oDataError(404, "Entity not found"));
                        return;
                    }
                    if (!etagMatches(ifMatch, currentEtag)) {
                        res.status(412).json(oDataError(412, "Precondition Failed", "ETag mismatch"));
                        return;
                    }
                }
                const result = await odataWriteService.runInTransaction((tx) =>
                    odataWriteService.update(model, req.params.id, body, tx),
                );
                if (!result.entity) {
                    res.status(404).json(oDataError(404, "Entity not found"));
                    return;
                }
                injectEtag(result.entity);
                res.status(200).json(result.entity);
            } catch (error) {
                res.status(500).json(oDataError(500, "Error updating entity", (error as Error).message));
            }
        };

        router.patch(`${base}/:id`, json, updateHandler);
        router.put(`${base}/:id`, json, updateHandler);

        router.delete(`${base}/:id`, async (req: Request, res: Response) => {
            try {
                const ifMatch = req.headers["if-match"] ?? req.headers["if-none-match"];
                if (ifMatch !== undefined) {
                    const currentEtag = await odataWriteService.getCurrentEtag(model, req.params.id);
                    if (currentEtag === null) {
                        res.status(404).json(oDataError(404, "Entity not found"));
                        return;
                    }
                    if (!etagMatches(ifMatch, currentEtag)) {
                        res.status(412).json(oDataError(412, "Precondition Failed", "ETag mismatch"));
                        return;
                    }
                }
                const result = await odataWriteService.runInTransaction((tx) =>
                    odataWriteService.remove(model, req.params.id, tx),
                );
                if (!result.deleted) {
                    res.status(404).json(oDataError(404, "Entity not found"));
                    return;
                }
                res.status(204).send();
            } catch (error) {
                res.status(500).json(oDataError(500, "Error deleting entity", (error as Error).message));
            }
        });
    }
}
