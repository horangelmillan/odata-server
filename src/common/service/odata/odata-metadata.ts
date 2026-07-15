// Fase R: transforma la metadata "CSDL+JSON" custom que genera `@phrasecode/odata`
// en un documento **CSDL JSON 4.01** válido que SAPUI5/OpenUI5 `ODataModel` v4
// puede consumir directamente (sin el shim EDMX del proyecto demo).
//
// La librería emite `{ $Version, $EntityContainer:"OData.Container", entities: { <ModelName>: {...} } }`
// pero NO declara el contenedor ni los `EntitySet`s, y deja los tipos sin namespace.
// SAPUI5 requiere (ver docs/04_Essentials/odata-v4-metadata-json-format):
//   - `$EntityContainer` apuntando a un contenedor que EXISTE y declara `EntitySet`s.
//   - Tipos de entidad namespaced (`Namespace.EntityType`) con `$kind:"EntityType"`.
//   - `NavigationProperty.$Type` totalmente cualificado + `$ReferentialConstraint`.
//
// Reusamos `dataSource.getMetadata()` (la metadata cruda de la librería, ya parcheada
// con los `$Endpoint` kebab y los tipos EDM) y solo re-escribimos la FORMA.

export interface RawEntityType {
    $Kind?: string;
    $Key?: string[];
    $Endpoint?: string;
    [key: string]: unknown;
}

export interface RawMetadata {
    entities?: Record<string, RawEntityType>;
}

const DEFAULT_NAMESPACE = "ODataServer";

function qualify(typeRef: string, namespace: string): string {
    const isCollection = typeRef.startsWith("Collection(") && typeRef.endsWith(")");
    if (isCollection) {
        const inner = typeRef.slice("Collection(".length, -1);
        return `Collection(${namespace}.${inner})`;
    }
    return `${namespace}.${typeRef}`;
}

export function transformToCsdl(raw: RawMetadata, namespace: string = DEFAULT_NAMESPACE): Record<string, unknown> {
    const entities = raw.entities ?? {};
    const containerName = `${namespace}.Container`;

    const csdl: Record<string, unknown> = {
        $Version: "4.0",
        $EntityContainer: containerName,
    };
    csdl[namespace] = { $kind: "Schema" };

    // 1) Tipos de entidad namespaced, con propiedades y navegación cualificadas.
    for (const [modelName, et] of Object.entries(entities)) {
        const typeKey = `${namespace}.${modelName}`;
        const entityType: Record<string, unknown> = {
            $kind: "EntityType",
            $Key: [...(et.$Key ?? [])],
        };

        for (const [propName, prop] of Object.entries(et)) {
            if (propName === "$Kind" || propName === "$Key" || propName === "$Endpoint") continue;
            const def = prop as Record<string, unknown>;
            if (def?.$Kind === "Property") {
                const property: Record<string, unknown> = {
                    $kind: "Property",
                    $Type: def.$Type,
                };
                if (def.$Nullable !== undefined) property.$Nullable = def.$Nullable;
                if (def.$DefaultValue !== undefined) property.$DefaultValue = def.$DefaultValue;
                entityType[propName] = property;
            } else if (def?.$Kind === "NavigationProperty") {
                const nav: Record<string, unknown> = {
                    $kind: "NavigationProperty",
                    $Type: qualify(String(def.$Type), namespace),
                };
                if (def.$ReferentialConstraint) {
                    const rc: Record<string, string> = {};
                    for (const [src, tgt] of Object.entries(def.$ReferentialConstraint as Record<string, string>)) {
                        // tgt viene como "TargetModel/key" sin namespace.
                        rc[src] = qualify(tgt, namespace);
                    }
                    nav.$ReferentialConstraint = rc;
                }
                entityType[propName] = nav;
            }
        }
        csdl[typeKey] = entityType;
    }

    // 2) Contenedor con EntitySets + NavigationPropertyBindings (para que SAPUI5
    //    resuelva las rutas de navegación desde el modelo).
    const container: Record<string, unknown> = { $kind: "EntityContainer" };
    for (const [modelName, et] of Object.entries(entities)) {
        const endpoint = et.$Endpoint ?? `/${modelName.toLowerCase()}`;
        const setName = endpoint.replace(/^\//, "");
        const entitySet: Record<string, unknown> = {
            $kind: "EntitySet",
            $Type: `${namespace}.${modelName}`,
        };

        const navBindings: Record<string, string> = {};
        for (const [propName, prop] of Object.entries(et)) {
            if (propName === "$Kind" || propName === "$Key" || propName === "$Endpoint") continue;
            const def = prop as Record<string, unknown>;
            if (def?.$Kind === "NavigationProperty") {
                const targetModel = String(def.$Type).replace(/^Collection\((.*)\)$/, "$1").replace(`${namespace}.`, "");
                const targetEndpoint = entities[targetModel]?.$Endpoint ?? `/${targetModel.toLowerCase()}`;
                navBindings[propName] = targetEndpoint.replace(/^\//, "");
            }
        }
        if (Object.keys(navBindings).length > 0) {
            entitySet.$NavigationPropertyBinding = navBindings;
        }
        container[setName] = entitySet;
    }
    csdl[containerName] = container;

    return csdl;
}
