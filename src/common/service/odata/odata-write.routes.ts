import express, { type Router, type Request, type Response } from "express";
import { ODataControler } from "@phrasecode/odata";
import { odataWriteService, type ODataBaseModel } from "./odata-write.service.js";
import { injectEtag, etagMatches } from "./odata-etag.js";
import { oDataError } from "./odata-error.js";

// Escritura directa OData (modo groupId "$direct" de SAPUI5). Reutiliza el
// mismo write service (y por tanto la misma instancia Sequelize/pool) que el
// $batch. Cada operación corre en su propia transacción atómica.
//
// NOTA: `express.json()` sólo parsea Content-Type application/json, así que
// montarlo aquí NO consume el cuerpo multipart/mixed del `$batch`.

function modelOf(controller: ODataControler): ODataBaseModel {
    return controller.getBaseModel() as unknown as ODataBaseModel;
}

export function registerWriteRoutes(router: Router, controllers: ODataControler[]): void {
    const json = express.json();

    for (const controller of controllers) {
        const endpoint = controller.getEndpoint();
        const base = `/${endpoint}`;
        const model = modelOf(controller);

        router.post(base, json, async (req: Request, res: Response) => {
            try {
                const result = await odataWriteService.runInTransaction((tx) =>
                    odataWriteService.create(model, req.body ?? {}, tx),
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
                    odataWriteService.update(model, req.params.id, req.body ?? {}, tx),
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
