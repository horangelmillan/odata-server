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
    // G3: EntitySet name se deriva del nombre de modelo (kebab), NO del endpoint,
    // para que el contrato de API sea estable independientemente del prefijo de ruta.
    const container: Record<string, unknown> = { $kind: "EntityContainer" };
    for (const [modelName, et] of Object.entries(entities)) {
        const setName = toKebabCase(modelName);
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
                navBindings[propName] = toKebabCase(targetModel);
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

// Fase R/F6: serializa el CSDL JSON 4.01 (arriba) a **EDMX XML** estándar.
// SAPUI5/OpenUI5 ODataModel v4 (runtime 1.150) consume EDMX XML en `$metadata`
// (no CSDL JSON), así que para bootstrappear SIN shim el server debe emitir XML.
// G3: convierte "ProductOData" → "product-odata" (kebab-case sin depender del endpoint).
function toKebabCase(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function xmlEscape(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export function csdlToEdmx(csdl: Record<string, unknown>, namespace: string = DEFAULT_NAMESPACE): string {
    const containerName = String(csdl.$EntityContainer ?? `${namespace}.Container`);
    const schemaName = namespace;

    const entityTypes = Object.entries(csdl).filter(
        ([k, v]) => k !== "$Version" && k !== "$EntityContainer" && k !== containerName &&
            (v as Record<string, unknown>)?.$kind === "EntityType"
    );

    const entityTypeXml = entityTypes.map(([typeKey, etRaw]) => {
        const et = etRaw as Record<string, unknown>;
        const typeName = typeKey.replace(`${namespace}.`, "");
        const key = (et.$Key as string[] | undefined) ?? [];
        const props = Object.entries(et).filter(([k]) => k !== "$kind" && k !== "$Key");

        const keyXml = key.length
            ? `      <Key>${key.map((k) => `<PropertyRef Name="${xmlEscape(k)}" />`).join("")}</Key>\n`
            : "";

        const propXml = props.map(([name, defRaw]) => {
            const def = defRaw as Record<string, unknown>;
            if (def.$kind === "Property") {
                const nullable = def.$Nullable ? ` Nullable="true"` : "";
                const defaultValue = def.$DefaultValue !== undefined ? ` DefaultValue="${xmlEscape(String(def.$DefaultValue))}"` : "";
                return `      <Property Name="${xmlEscape(name)}" Type="${xmlEscape(String(def.$Type))}"${nullable}${defaultValue} />`;
            }
            if (def.$kind === "NavigationProperty") {
                const type = String(def.$Type);
                const rc = def.$ReferentialConstraint as Record<string, string> | undefined;
                const rcXml = rc
                    ? `>\n` + Object.entries(rc)
                        .map(([src, tgt]) => `        <ReferentialConstraint Property="${xmlEscape(src)}" ReferencedProperty="${xmlEscape(tgt)}" />`)
                        .join("\n") + `\n      </NavigationProperty>`
                    : ` />\n      `;
                const open = `      <NavigationProperty Name="${xmlEscape(name)}" Type="${xmlEscape(type)}"`;
                return rc ? `${open}${rcXml}` : `${open} />`;
            }
            return "";
        }).filter(Boolean).join("\n");

        return `    <EntityType Name="${xmlEscape(typeName)}">\n${keyXml}${propXml}\n    </EntityType>`;
    }).join("\n");

    const container = (csdl[containerName] as Record<string, unknown>) ?? {};
    const entitySets = Object.entries(container).filter(([k, v]) => (v as Record<string, unknown>)?.$kind === "EntitySet");
    const entitySetXml = entitySets.map(([setName, esRaw]) => {
        const es = esRaw as Record<string, unknown>;
        const type = String(es.$Type);
        const navBindings = es.$NavigationPropertyBinding as Record<string, string> | undefined;
        if (navBindings && Object.keys(navBindings).length) {
            const nb = Object.entries(navBindings)
                .map(([p, t]) => `        <NavigationPropertyBinding Path="${xmlEscape(p)}" Target="${xmlEscape(t)}" />`)
                .join("\n");
            return `    <EntitySet Name="${xmlEscape(setName)}" EntityType="${xmlEscape(type)}">\n${nb}\n    </EntitySet>`;
        }
        return `    <EntitySet Name="${xmlEscape(setName)}" EntityType="${xmlEscape(type)}" />`;
    }).join("\n");

    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:Reference Uri="http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Core.V1.xml">
    <edmx:Include Namespace="Org.OData.Core.V1" Alias="Core"/>
  </edmx:Reference>
  <edmx:Reference Uri="http://docs.oasis-open.org/odata/odata/v4.0/os/vocabularies/Org.OData.Capabilities.V1.xml">
    <edmx:Include Namespace="Org.OData.Capabilities.V1" Alias="Capabilities"/>
  </edmx:Reference>
  <edmx:DataServices>
    <Schema Namespace="${xmlEscape(schemaName)}" xmlns="http://docs.oasis-open.org/odata/ns/edm">
${entityTypeXml}
      <EntityContainer Name="Container">
${entitySetXml}
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}
