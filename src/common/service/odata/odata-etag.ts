// G1: control de concurrencia optimista para SAPUI5/OpenUI5 ODataModel v4.
//
// SAPUI5 `ODataModel` v4 usa `@odata.etag` (en el cuerpo de la entidad) y las
// cabeceras `If-Match` / `If-None-Match` para concurrencia optimista. El
// servidor debe (1) emitir `@odata.etag` en cada entidad y (2) validar
// `If-Match` en update/delete, respondiendo 412 si hay desajuste.
//
// Fuente del etag: la columna de auditoría `updatedAt` (ISO 8601). Si no
// existiera, se usa `createdAt` como fallback. Ambas están presentes en
// ProductOData y CategoryOData.

export const ETAG_PROPERTY = "@odata.etag";

// Normaliza la fuente del etag a texto ISO 8601. Sequelize entrega `DATE` como
// `Date` en los objetos crudos pero los serializa a ISO en el JSON de salida;
// usar `String(Date)` produciría un formato local dependiente del locale y
// rompería la comparación con `If-Match`. Por eso forzamos ISO aquí.
export function etagValueOf(candidate: unknown): string | undefined {
    if (candidate === undefined || candidate === null) return undefined;
    if (candidate instanceof Date) return candidate.toISOString();
    return String(candidate);
}

function rawEtag(entity: Record<string, unknown>): string | undefined {
    return etagValueOf(entity["updatedAt"] ?? entity["createdAt"]);
}

// Inyecta `@odata.etag` recursivamente en cualquier objeto que tenga una
// columna de auditoría (`updatedAt`/`createdAt`), cubriendo colecciones,
// entidades individuales y navegaciones anidadas (`$expand`). Es idempotente:
// no sobreescribe un etag ya presente.
export function injectEtag(target: unknown): void {
    if (Array.isArray(target)) {
        for (const item of target) injectEtag(item);
        return;
    }
    if (target && typeof target === "object") {
        const obj = target as Record<string, unknown>;
        if (obj[ETAG_PROPERTY] === undefined) {
            const etag = rawEtag(obj);
            if (etag !== undefined) obj[ETAG_PROPERTY] = etag;
        }
        for (const key of Object.keys(obj)) {
            const child = obj[key];
            if (child && typeof child === "object") injectEtag(child);
        }
    }
}

// Normaliza la cabecera `If-Match`/`If-None-Match`: quita comillas envolventes
// (HTTP las añade) y reconoce el comodín `*`.
export function normalizeEtagHeader(header: string | undefined): string | null {
    if (!header) return null;
    let value = header.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    return value === "*" ? "*" : value;
}

// Compara el `If-Match` recibido con el etag actual de la entidad.
// - sin cabecera -> true (el cliente no pidió control de concurrencia)
// - `*`          -> true (semántica "si existe"; la existencia la valida el caller)
// - etag nulo    -> false (entidad inexistente; el caller debe responder 404)
export function etagMatches(ifMatch: string | undefined, currentEtag: string | null): boolean {
    const header = normalizeEtagHeader(ifMatch);
    if (header === null) return true;
    if (header === "*") return true;
    if (currentEtag === null) return false;
    return header === currentEtag;
}
