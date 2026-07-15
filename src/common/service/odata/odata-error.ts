// G2: formato de error OData v4 estándar para SAPUI5/OpenUI5.
//
// OData v4 espera los errores como:
//   { "error": { "code": "...", "message": "...", "target": "...", "details": [] } }
// SAPUI5 `MessageManager` lee `error.message`. El servidor emitía
// `{ error: "msg" }` / `{ error: "msg", detail: "..." }`, que UI5 no parsea
// correctamente. Este módulo unifica la forma en todas las rutas OData.

export interface ODataErrorDetail {
    code: string;
    message: string;
    target?: string;
}

export interface ODataErrorShape {
    error: {
        code: string;
        message: string;
        target?: string;
        details: ODataErrorDetail[];
    };
}

export function oDataError(
    status: number,
    message: string,
    detail?: string,
    target?: string,
): ODataErrorShape {
    return {
        error: {
            code: String(status),
            message,
            target,
            details: detail ? [{ code: String(status), message: detail }] : [],
        },
    };
}

// Convierte un cuerpo de error NO estándar (p.ej. `{error:"msg"}`,
// `{error:"msg",detail:"..."}` de nuestras rutas, o el de la librería) al
// formato OData v4. Si ya es estándar, lo devuelve intacto. Se usa como red de
// seguridad en el wrapper de `res.json` para cubrir también el path de lectura
// (manejado por `@phrasecode/odata`).
//
// IMPORTANTE: solo transforma cuerpos que contienen una clave `error`. Un
// cuerpo de éxito (colección, entidad, `$metadata`) NO tiene esa clave y se
// devuelve intacto; de lo contrario se destruirían las respuestas válidas.
export function normalizeErrorBody(body: unknown, fallbackStatus = 0): unknown {
    if (!body || typeof body !== "object") return body;
    const obj = body as Record<string, unknown>;
    const err = obj["error"];

    // Respuesta de éxito: sin clave `error` -> se deja intacta.
    if (err === undefined || err === null) return body;

    // ¿Ya es estándar? (error es objeto con `message` string)
    if (err && typeof err === "object" && typeof (err as Record<string, unknown>)["message"] === "string") {
        return body;
    }

    let message: string;
    let detail: string | undefined;
    if (typeof err === "string") {
        message = err;
    } else if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        if (typeof e["message"] === "string") message = e["message"];
        else if (typeof e["detail"] === "string") message = e["detail"] as string;
        else message = "An error occurred";
        if (typeof e["detail"] === "string") detail = e["detail"] as string;
    } else {
        message = "An error occurred";
    }

    const status = Number(obj["status"]) || fallbackStatus || 0;
    return oDataError(status, message, detail);
}
