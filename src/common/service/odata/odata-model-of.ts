import type { ODataBaseModel } from "./odata-write.service.js";

/**
 * Helper compartido (ciclo 13, E1): resuelve el modelo OData base de un
 * controlador de dominio. La librería `@phrasecode/odata` no exporta el tipo
 * del modelo base, por lo que se requiere un cast; centralizarlo en un único
 * lugar evita la duplicación del patrón en los servicios de dominio.
 */
export function modelOf(controller: { getBaseModel(): unknown }): ODataBaseModel {
    return controller.getBaseModel() as unknown as ODataBaseModel;
}
