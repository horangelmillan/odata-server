// Negociación de `$format` (Fase I). El validador de `@phrasecode/odata`
// rechaza con 400 cualquier parámetro `$...` fuera de su whitelist, y `$format`
// no está incluido. SAPUI5 (ODataModel v4) puede emitir `$format=json`, así que
// lo interceptamos ANTES de que llegue al QueryParser: si el valor es JSON lo
// eliminamos del query (equivale a no enviarlo, ya que el server serializa JSON
// por defecto); si es otro formato devolvemos 415 Unsupported Media Type.
//
// Solo soportamos JSON. Los valores OData válidos para JSON son `json` y
// `application/json` (con parámetros opcionales tipo `;odata.metadata=minimal`).

const SUPPORTED_FORMATS = new Set(["json", "application/json"]);

export interface FormatResult {
    // Query string sin el parámetro `$format` (resto intacto, sin re-codificar).
    query: string;
    // true si `$format` venía con un valor no soportado (no JSON).
    unsupported: boolean;
}

// Acepta `$format` y su forma percent-encoded `%24format`. Preserva el resto de
// la query verbatim (no usamos URLSearchParams.toString() porque re-codifica
// espacios como `+`, que `decodeURIComponent` NO revierte y rompería `$filter`).
const FORMAT_PARAM = /(?:^|&)(?:\$format|%24format)=([^&]*)/i;
const FORMAT_PARAM_GLOBAL = /(?:^|&)(?:\$format|%24format)=[^&]*/gi;

export function stripFormat(rawQuery: string): FormatResult {
    if (!rawQuery) return { query: rawQuery, unsupported: false };

    const match = rawQuery.match(FORMAT_PARAM);
    if (!match) return { query: rawQuery, unsupported: false };

    const value = decodeURIComponent(match[1]).toLowerCase().split(";")[0].trim();
    const unsupported = !SUPPORTED_FORMATS.has(value);

    let query = rawQuery.replace(FORMAT_PARAM_GLOBAL, "");
    query = query.replace(/^&/, "");

    return { query, unsupported };
}
