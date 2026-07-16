import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Op } from "sequelize";
import request from "supertest";
import type { Express } from "express";
import expressApp from "../../main.js";
import { db } from "../../common/service/ORM/sequelize.service.js";
import { dataSource } from "../../common/service/odata/datasource.js";
import { CategoryModel } from "../../core/category/model/category.model.js";

// F1: `ProductModel` (db.define de Sequelize) fue eliminado; el modelo OData es
// ahora la única fuente de verdad. Para sembrar/limpiar en los tests de
// integración usamos la instancia Sequelize del `dataSource` OData (misma tabla).
const odataSeq = (dataSource as unknown as { sequelizerAdaptor: { sequelize: any } }).sequelizerAdaptor.sequelize;
const ProductSeq = odataSeq.models.products;

// --- Helpers Fase H: construir y parsear peticiones $batch de escritura ---

interface BatchOp {
    method: string;
    url: string;
    contentId: string;
    body?: Record<string, unknown>;
    ifMatch?: string;
}

function buildChangeset(ops: BatchOp[], boundary = "batch_h", changeset = "cs_h"): string {
    const lines: string[] = [`--${boundary}`, `Content-Type: multipart/mixed; boundary=${changeset}`, ""];
    for (const op of ops) {
        lines.push(`--${changeset}`);
        lines.push("Content-Type: application/http");
        lines.push("Content-Transfer-Encoding: binary");
        lines.push(`Content-ID: ${op.contentId}`);
        lines.push("");
        lines.push(`${op.method} ${op.url} HTTP/1.1`);
        if (op.body !== undefined) {
            lines.push("Content-Type: application/json");
            lines.push("");
            lines.push(JSON.stringify(op.body));
        } else {
            lines.push("");
        }
    }
    lines.push(`--${changeset}--`);
    lines.push(`--${boundary}--`);
    lines.push("");
    return lines.join("\r\n");
}

// Construye un $batch changeset con el envelope EXACTO que emite SAPUI5
// (ODataModel v4): cabeceras OData-Version/Accept en la petición interna,
// Content-Transfer-Encoding: binary y Content-ID en cada parte.
function buildSapui5Changeset(ops: BatchOp[], boundary = "batch_sapui5", changeset = "cs_sapui5"): string {
    const lines: string[] = [`--${boundary}`, `Content-Type: multipart/mixed; boundary=${changeset}`, ""];
    for (const op of ops) {
        lines.push(`--${changeset}`);
        lines.push("Content-Type: application/http");
        lines.push("Content-Transfer-Encoding: binary");
        lines.push(`Content-ID: ${op.contentId}`);
        lines.push("");
        lines.push(`${op.method} ${op.url} HTTP/1.1`);
        lines.push("OData-Version: 4.0");
        lines.push("Accept: application/json;odata.metadata=minimal");
        if (op.ifMatch !== undefined) lines.push(`If-Match: ${op.ifMatch}`);
        lines.push("Content-Type: application/json");
        lines.push("");
        if (op.body !== undefined) lines.push(JSON.stringify(op.body));
        lines.push("");
    }
    lines.push(`--${changeset}--`);
    lines.push(`--${boundary}--`);
    lines.push("");
    return lines.join("\r\n");
}

async function postBatch(app: Express, body: string, boundary = "batch_h"): Promise<{ status: number; text: string }> {    const res = await request(app)
        .post("/odata/$batch")
        .set("Content-Type", `multipart/mixed;boundary=${boundary}`)
        .send(body)
        .buffer(true)
        .parse((response, callback) => {
            let data = "";
            response.on("data", (chunk) => (data += chunk));
            response.on("end", () => callback(null, data));
        });
    return { status: res.status, text: res.body as unknown as string };
}

function firstJson(text: string): Record<string, any> {
    const start = text.indexOf("{", text.indexOf("Content-Type: application/json"));
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") {
            depth--;
            if (depth === 0) return JSON.parse(text.substring(start, i + 1)) as Record<string, any>;
        }
    }
    throw new Error("No JSON object found in batch response");
}

async function dbReady(): Promise<boolean> {
    try {
        await db.authenticate();
        return true;
    } catch {
        return false;
    }
}

// Top-level await: detecta Postgres (docker) en tiempo de recolección para
// poder saltar el suite de integración de forma determinista cuando no hay BD.
const dbAvailable = await dbReady();

// Fase R: $metadata CSDL JSON 4.01 válido para SAPUI5/OpenUI5 ODataModel v4.
// Reemplaza el CSDL+JSON custom de la librería (que UI5 no puede bootstrappear).
describe("OData $metadata: CSDL 4.01 válido para SAPUI5 (Fase R)", () => {
    const app = expressApp();

    it("expone $EntityContainer con EntitySets namespaced y $NavigationPropertyBinding", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const meta = res.body as Record<string, any>;
        expect(meta.$Version).toBe("4.0");
        expect(meta.$EntityContainer).toBe("ODataServer.Container");

        const container = meta["ODataServer.Container"];
        expect(container.$kind).toBe("EntityContainer");
        // EntitySets por endpoint kebab, con $Type totalmente cualificado.
        expect(container["product-odata"].$kind).toBe("EntitySet");
        expect(container["product-odata"].$Type).toBe("ODataServer.ProductOData");
        expect(container["category-odata"].$Type).toBe("ODataServer.CategoryOData");
        // Bindings de navegación para que UI5 resuelva las rutas de expansión.
        expect(container["product-odata"].$NavigationPropertyBinding.category).toBe("category-odata");
        expect(container["category-odata"].$NavigationPropertyBinding.products).toBe("product-odata");
    });

    it("los EntityTypes son namespaced y la navegación usa $Type cualificado", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const meta = res.body as Record<string, any>;
        const product = meta["ODataServer.ProductOData"];
        expect(product.$kind).toBe("EntityType");
        expect(product.category.$kind).toBe("NavigationProperty");
        expect(product.category.$Type).toBe("ODataServer.CategoryOData");
        const category = meta["ODataServer.CategoryOData"];
        expect(category.products.$Type).toBe("Collection(ODataServer.ProductOData)");
    });
});

// Fase I: tipos EDM en $metadata y negociación de $format. No requiere BD
// (el $metadata se genera de los modelos y el 415 corta antes de tocar la BD).
describe("OData tipos EDM + $format (Fase I)", () => {
    const app = expressApp();

    it("$metadata tipa precio como Edm.Decimal y las fechas como Edm.DateTimeOffset", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const product = (res.body as Record<string, any>)["ODataServer.ProductOData"];
        expect(product.$kind).toBe("EntityType");
        expect(product.id.$Type).toBe("Edm.Int32");
        expect(product.precio.$Type).toBe("Edm.Decimal");
        expect(product.createdAt.$Type).toBe("Edm.DateTimeOffset");
        expect(product.updatedAt.$Type).toBe("Edm.DateTimeOffset");
    });

    it("$format=json es aceptado (no 400/415) sobre $metadata", async () => {
        const res = await request(app).get("/odata/$metadata?$format=json");
        expect(res.status).toBe(200);
        expect((res.body as Record<string, any>)["ODataServer.Container"]).toHaveProperty("product-odata");
    });

    it("$format con valor no-JSON devuelve 415 Unsupported Media Type", async () => {
        const res = await request(app).get("/odata/product-odata?$format=xml");
        expect(res.status).toBe(415);
    });
});

describe.skipIf(!dbAvailable)("OData $expand contra Postgres (Fase E + Fase G)", () => {
    const app = expressApp();
    let electronicId = 0;
    let homeId = 0;

    beforeAll(async () => {
        await db.sync({ alter: true });
        await odataSeq.sync({ alter: true });
        await CategoryModel.destroy({ where: {} });
        await ProductSeq.destroy({ where: {} });

        const electronics = await CategoryModel.create({ nombre: "Electrónica" });
        const home = await CategoryModel.create({ nombre: "Hogar" });
        electronicId = electronics.id;
        homeId = home.id;

        // F1: el seed de productos usa la instancia Sequelize del `dataSource`
        // OData, cuyo modelo se define con `timestamps: false` (ver
        // `@phrasecode/odata`). Por eso fijamos createdAt/updatedAt en el
        // seed explícitamente para que los tests de fechas ISO (Fase I) y el
        // @odata.etag anidado en $expand tengan valor (igual que hacía el
        // antes `ProductModel` REST con `timestamps: true`).
        const now = new Date();
        await ProductSeq.create({ nombre: "Laptop", precio: 1500, categoria: "Electrónica", categoriaId: electronicId, createdAt: now, updatedAt: now });
        await ProductSeq.create({ nombre: "Mouse", precio: 25, categoria: "Electrónica", categoriaId: electronicId, createdAt: now, updatedAt: now });
        await ProductSeq.create({ nombre: "Teclado", precio: 40, categoria: "Electrónica", categoriaId: electronicId, createdAt: now, updatedAt: now });
        await ProductSeq.create({ nombre: "Silla", precio: 300, categoria: "Hogar", categoriaId: homeId, createdAt: now, updatedAt: now });
    });

    afterAll(async () => {
        await db.close();
    });

    it("product?$expand=category anida la categoría en cada producto", async () => {
        const res = await request(app).get("/odata/product-odata?$expand=category");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(Array.isArray(value)).toBe(true);
        expect(value.length).toBeGreaterThan(0);

        for (const product of value) {
            expect(product).toHaveProperty("category");
            expect(product.category).toHaveProperty("id");
            expect(product.category).toHaveProperty("nombre");
            expect(product.categoriaId).toBe(product.category.id);
        }
    });

    it("category?$expand=products anida la colección de productos", async () => {
        const res = await request(app).get("/odata/category-odata?$expand=products");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(Array.isArray(value)).toBe(true);
        expect(value.length).toBeGreaterThan(0);

        for (const category of value) {
            expect(category).toHaveProperty("products");
            expect(Array.isArray(category.products)).toBe(true);
            expect(category.products.length).toBeGreaterThan(0);
            for (const product of category.products) {
                expect(product.categoriaId).toBe(category.id);
            }
        }
    });

    it("product?$expand=category&$count=true devuelve @odata.count y la expansión", async () => {
        const res = await request(app).get("/odata/product-odata?$expand=category&$count=true");

        expect(res.status).toBe(200);
        const body = res.body as Record<string, any>;
        expect(body["@odata.count"]).toBeGreaterThan(0);
        expect(Array.isArray(body.value)).toBe(true);
        expect(body.value[0]).toHaveProperty("category");
        expect(body.value[0].category).toHaveProperty("id");
    });

    // --- Fase G: recorte de navegación ($select/$filter/$orderby/$top/$skip) ---

    it("hasMany: $expand=products($select=id,nombre) recorta columnas y adjunta hijos", async () => {
        const res = await request(app).get(`/odata/category-odata?$expand=products($select=id,nombre)`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        expect(electronic).toBeDefined();
        expect(Array.isArray(electronic.products)).toBe(true);
        // Riesgo FK: con $select restringido, Sequelize debe seguir incluyendo
        // la FK para agrupar los hijos; si no, products quedaría vacío.
        expect(electronic.products.length).toBe(3);
        for (const product of electronic.products) {
            expect(product).toHaveProperty("nombre");
            expect(product).not.toHaveProperty("precio");
        }
    });

    it("hasMany: $expand=products($filter=precio gt 100) filtra hijos", async () => {
        const res = await request(app).get(`/odata/category-odata?$expand=products($filter=precio gt 100)`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        const home = value.find((c) => c.id === homeId);
        expect(electronic.products.length).toBe(1);
        expect(electronic.products[0].nombre).toBe("Laptop");
        expect(home.products.length).toBe(1);
        expect(home.products[0].nombre).toBe("Silla");
    });

    it("hasMany: $expand=products($orderby=nombre asc;$top=2) ordena y limita hijos", async () => {
        const res = await request(app).get(`/odata/category-odata?$expand=products($orderby=nombre asc;$top=2)`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        expect(electronic.products.length).toBe(2);
        expect(electronic.products[0].nombre).toBe("Laptop");
        expect(electronic.products[1].nombre).toBe("Mouse");
    });

    it("hasMany: $expand=products($top=2;$skip=1) pagina hijos por padre", async () => {
        const res = await request(app).get(`/odata/category-odata?$expand=products($top=2;$skip=1)`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        expect(electronic.products.length).toBe(2);
    });

    it("hasMany: $expand=products($select=id,nombre;$top=2;$filter=precio gt 10;$orderby=nombre) combina opciones", async () => {
        const res = await request(app).get(
            `/odata/category-odata?$expand=products($select=id,nombre;$top=2;$filter=precio gt 10;$orderby=nombre)`,
        );

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        expect(electronic.products.length).toBe(2);
        for (const product of electronic.products) {
            expect(product).not.toHaveProperty("precio");
        }
    });

    it("hasMany + $count=true: @odata.count es del padre y los hijos respetan recorte", async () => {
        const res = await request(app).get(`/odata/category-odata?$expand=products($select=id,nombre)&$count=true`);

        expect(res.status).toBe(200);
        const body = res.body as Record<string, any>;
        expect(body["@odata.count"]).toBeGreaterThan(0);
        const electronic = (body.value as Record<string, any>[]).find((c) => c.id === electronicId);
        expect(electronic.products.length).toBe(3);
    });

    it("belongsTo: $expand=category($select=id,nombre) recorta la entidad padre", async () => {
        const res = await request(app).get(`/odata/product-odata?$expand=category($select=id,nombre)`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        for (const product of value) {
            expect(product).toHaveProperty("category");
            expect(product.category).toHaveProperty("nombre");
            expect(product.category).not.toHaveProperty("categoria");
        }
    });

    it("belongsTo: $expand=category($filter=nombre eq 'Electrónica') filtra por navegación", async () => {
        const res = await request(app).get(
            `/odata/product-odata?$expand=category($filter=nombre eq 'Electrónica')`,
        );

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        for (const product of value) {
            if (product.category) {
                expect(product.category.nombre).toBe("Electrónica");
            }
        }
    });

    it("top-level $select + nested $expand=category coexisten", async () => {
        const res = await request(app).get(`/odata/product-odata?$select=id,nombre,precio&$expand=category`);

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        const product = value[0];
        expect(product).toHaveProperty("nombre");
        expect(product).toHaveProperty("precio");
        expect(product).not.toHaveProperty("categoria");
        expect(product).toHaveProperty("category");
    });

    // --- Fase G: punto de control con tráfico real de SAPUI5/OpenUI5 ---
    // SAPUI5 (ODataModel v4) emite las opciones URL-encodeadas (`,` -> `%2C`,
    // espacio -> `%20`) y, SALVO groupId "$direct", envía las lecturas por
    // `$batch` (multipart/mixed con un changeset). Estos tests reproducen
    // ese tráfico exacto como contrato de compatibilidad automatizado.

    it("SAPUI5: GET con opciones URL-encodeadas (%2C) aplica el recorte", async () => {
        const res = await request(app)
            .get("/odata/category-odata?$expand=products($select=id%2Cnombre)&$select=id%2Cnombre")
            .set("OData-Version", "4.0")
            .set("Accept", "application/json;odata.metadata=minimal");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        const electronic = value.find((c) => c.id === electronicId);
        expect(electronic).toBeDefined();
        expect(electronic.products.length).toBe(3);
        for (const product of electronic.products) {
            expect(product).toHaveProperty("nombre");
            expect(product).not.toHaveProperty("precio");
        }
    });

    it("SAPUI5: $batch (changeset) con $expand anidado codificado aplica el recorte", async () => {
        const boundary = "batch_sapui5";
        const inner = "changeset_sapui5";
        const body = [
            `--${boundary}`,
            `Content-Type: multipart/mixed; boundary=${inner}`,
            "Content-Transfer-Encoding: binary",
            "",
            `--${inner}`,
            "Content-Type: application/http",
            "Content-Transfer-Encoding: binary",
            "Content-ID: 1",
            "",
            "GET category-odata?$expand=products($select=id%2Cnombre) HTTP/1.1",
            "Accept: application/json;odata.metadata=minimal",
            "OData-Version: 4.0",
            "",
            `--${inner}--`,
            `--${boundary}--`,
            "",
        ].join("\r\n");

        const res = await request(app)
            .post("/odata/$batch")
            .set("Content-Type", `multipart/mixed;boundary=${boundary}`)
            .send(body)
            .buffer(true)
            .parse((response, callback) => {
                let data = "";
                response.on("data", (chunk) => (data += chunk));
                response.on("end", () => callback(null, data));
            });

        expect(res.status).toBe(200);
        const text = res.body as unknown as string;
        const jPos = text.lastIndexOf("Content-Type: application/json");
        const start = text.indexOf("{", jPos);
        const end = text.lastIndexOf("}");
        const obj = JSON.parse(text.substring(start, end + 1)) as Record<string, any>;
        const electronic = (obj.value as Record<string, any>[]).find((c) => c.id === electronicId);
        expect(electronic).toBeDefined();
        expect(electronic.products.length).toBe(3);
        expect(electronic.products[0]).toHaveProperty("nombre");
        expect(electronic.products[0]).not.toHaveProperty("precio");
    });

    // --- Fase I: fechas Edm.DateTimeOffset en ISO 8601 + $format sobre datos ---

    it("I: product-odata devuelve createdAt/updatedAt en ISO 8601 (compat SAPUI5)", async () => {
        const res = await request(app).get("/odata/product-odata");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(value.length).toBeGreaterThan(0);
        const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
        expect(value[0].createdAt).toMatch(iso8601);
        expect(value[0].updatedAt).toMatch(iso8601);
    });

    it("I: $format=json sobre datos devuelve 200 y la colección (se ignora)", async () => {
        const res = await request(app).get("/odata/product-odata?$format=json&$select=id,nombre");

        expect(res.status).toBe(200);
        const value = (res.body as any).value as Record<string, any>[];
        expect(Array.isArray(value)).toBe(true);
        expect(value[0]).toHaveProperty("nombre");
    });

    // --- Fase H: escritura vía $batch (changesets atómicos) + escritura directa ---
    // Datos aislados con prefijo "H_" y limpieza en afterEach para no alterar el
    // seed que usan las pruebas de lectura (Fases E/G) de este mismo archivo.

    afterEach(async () => {
        // OJO: en LIKE el `_` es comodín de un carácter; escapamos con `\` para
        // que "H\_%" matchee el prefijo literal "H_" y NO borre el seed "Hogar".
        await ProductSeq.destroy({ where: { nombre: { [Op.like]: "H\\_%" } } });
        await CategoryModel.destroy({ where: { nombre: { [Op.like]: "H\\_%" } } });
    });

    it("H: changeset POST crea la entidad (201 + Location + Content-ID)", async () => {
        const body = buildChangeset([
            { method: "POST", url: "category-odata", contentId: "1", body: { nombre: "H_CreateCat" } },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        expect(text).toContain("HTTP/1.1 201 Created");
        expect(text).toContain("Content-ID: 1");
        expect(text).toMatch(/Location: \/odata\/category-odata\(\d+\)/);

        const created = firstJson(text);
        expect(created.nombre).toBe("H_CreateCat");
        expect(created).toHaveProperty("id");

        const row = await CategoryModel.findOne({ where: { nombre: "H_CreateCat" } });
        expect(row).not.toBeNull();
    });

    it("H: changeset PATCH actualiza la entidad (200)", async () => {
        const seed = await CategoryModel.create({ nombre: "H_Upd" });
        const body = buildChangeset([
            { method: "PATCH", url: `category-odata(${seed.id})`, contentId: "1", body: { nombre: "H_Upd_Changed" } },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        expect(text).toContain("HTTP/1.1 200 OK");

        const row = await CategoryModel.findByPk(seed.id);
        expect(row?.nombre).toBe("H_Upd_Changed");
    });

    it("H: changeset DELETE elimina la entidad (204)", async () => {
        const seed = await CategoryModel.create({ nombre: "H_Del" });
        const body = buildChangeset([
            { method: "DELETE", url: `category-odata(${seed.id})`, contentId: "1" },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        expect(text).toContain("HTTP/1.1 204 No Content");

        const row = await CategoryModel.findByPk(seed.id);
        expect(row).toBeNull();
    });

    it("H: changeset atómico hace rollback completo si una operación falla", async () => {
        const body = buildChangeset([
            { method: "POST", url: "category-odata", contentId: "1", body: { nombre: "H_Rollback" } },
            { method: "PATCH", url: "category-odata(99999999)", contentId: "2", body: { nombre: "H_ShouldNotApply" } },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        // G2: el error del changeset usa el formato OData v4 estándar
        // (code 404 + mensaje "Not Found" + detalle con la entidad).
        expect(text).toContain("HTTP/1.1 404 Not Found");
        expect(text).toContain('"code":"404"');
        expect(text).toContain("Entity 'category-odata(99999999)' not found");

        // Atomicidad: el POST previo NO debe haber persistido tras el rollback.
        const row = await CategoryModel.findOne({ where: { nombre: "H_Rollback" } });
        expect(row).toBeNull();
    });

    it("H: changeset resuelve referencia Content-ID ($1) entre operaciones", async () => {
        const body = buildChangeset([
            { method: "POST", url: "category-odata", contentId: "1", body: { nombre: "H_Cid" } },
            { method: "PATCH", url: "category-odata($1)", contentId: "2", body: { nombre: "H_Cid_Updated" } },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        expect(text).toContain("HTTP/1.1 201 Created");
        expect(text).toContain("HTTP/1.1 200 OK");

        const updated = await CategoryModel.findOne({ where: { nombre: "H_Cid_Updated" } });
        expect(updated).not.toBeNull();
        const stale = await CategoryModel.findOne({ where: { nombre: "H_Cid" } });
        expect(stale).toBeNull();
    });

    it("H: changeset con GET dentro se procesa como lectura (compat SAPUI5)", async () => {
        // SAPUI5 v4 envía lecturas dentro de un multipart/mixed; el GET debe
        // resolverse como lectura de solo lectura (200), no rechazarse.
        const body = buildChangeset([
            { method: "GET", url: "category-odata", contentId: "1" },
        ]);
        const { status, text } = await postBatch(app, body);

        expect(status).toBe(200);
        expect(text).toContain("HTTP/1.1 200 OK");
        expect(text).not.toContain('"error"');
        expect(text).toContain('"value"');
    });

    it("H: escritura directa ($direct) POST/PATCH/DELETE por entidad", async () => {
        const createRes = await request(app)
            .post("/odata/category-odata")
            .send({ nombre: "H_Direct" });
        expect(createRes.status).toBe(201);
        expect(createRes.headers["location"]).toMatch(/\/odata\/category-odata\(\d+\)/);
        const id = (createRes.body as Record<string, any>).id as number;
        expect(id).toBeGreaterThan(0);

        const patchRes = await request(app)
            .patch(`/odata/category-odata/${id}`)
            .send({ nombre: "H_Direct_Changed" });
        expect(patchRes.status).toBe(200);
        expect((patchRes.body as Record<string, any>).nombre).toBe("H_Direct_Changed");

        const deleteRes = await request(app).delete(`/odata/category-odata/${id}`);
        expect(deleteRes.status).toBe(204);

        const row = await CategoryModel.findByPk(id);
        expect(row).toBeNull();
    });

    it("H: escritura directa PATCH a entidad inexistente devuelve 404", async () => {
        const res = await request(app)
            .patch("/odata/category-odata/99999999")
            .send({ nombre: "H_Nope" });
        expect(res.status).toBe(404);
    });

    // --- Fase T: validación del envelope $batch EXACTO de SAPUI5 (ODataModel v4) ---
    // Reproduce el wire-format realista que emite el cliente SAPUI5/OpenUI5 para
    // un changeset de escritura (cabeceras OData-Version/Accept, Content-ID,
    // changeset anidado). Si pasa, el server maneja el $batch write de UI5 sin 405.
    describe("Fase T: $batch write changeset con envelope de SAPUI5 (Fase H+)", () => {
        it("T: changeset POST con envelope SAPUI5 crea la entidad (201 + Location + Content-ID)", async () => {
            const body = buildSapui5Changeset([
                { method: "POST", url: "category-odata", contentId: "1", body: { nombre: "H_Sapui5Post" } },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5", );

            expect(status).toBe(200);
            expect(text).toContain("HTTP/1.1 201 Created");
            expect(text).toContain("Content-ID: 1");
            expect(text).toMatch(/Location: \/odata\/category-odata\(\d+\)/);
            expect(text).toContain('"nombre":"H_Sapui5Post"');
        });

        it("T: changeset PATCH/DELETE con envelope SAPUI5 (200/204)", async () => {
            const seed = await CategoryModel.create({ nombre: "H_Sapui5Upd" });
            const body = buildSapui5Changeset([
                { method: "PATCH", url: `category-odata(${seed.id})`, contentId: "1", body: { nombre: "H_Sapui5Upd_Changed" } },
                { method: "DELETE", url: `category-odata(${seed.id})`, contentId: "2" },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5");

            expect(status).toBe(200);
            expect(text).toContain("HTTP/1.1 200 OK");
            expect(text).toContain("HTTP/1.1 204 No Content");
            const row = await CategoryModel.findByPk(seed.id);
            expect(row).toBeNull();
        });

        it("T: deep-create resuelve referencia Content-ID ($1) en envelope SAPUI5", async () => {
            const body = buildSapui5Changeset([
                { method: "POST", url: "category-odata", contentId: "1", body: { nombre: "H_Sapui5Cid" } },
                { method: "PATCH", url: "category-odata($1)", contentId: "2", body: { nombre: "H_Sapui5Cid_Updated" } },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5");

            expect(status).toBe(200);
            expect(text).toContain("HTTP/1.1 201 Created");
            expect(text).toContain("HTTP/1.1 200 OK");
            const updated = await CategoryModel.findOne({ where: { nombre: "H_Sapui5Cid_Updated" } });
            expect(updated).not.toBeNull();
            const stale = await CategoryModel.findOne({ where: { nombre: "H_Sapui5Cid" } });
            expect(stale).toBeNull();
        });
    });

    // --- Fase X / G1: ETag y concurrencia optimista para SAPUI5 ODataModel v4 ---
    // El servidor debe emitir `@odata.etag` en lecturas y validar `If-Match`
    // en update/delete (con el envelope de $batch y escritura directa).
    describe("Fase X: ETag / optimistic concurrency (G1)", () => {
        const etagOf = (body: Record<string, any>) => body["@odata.etag"] as string | undefined;

        it("GET colección inyecta @odata.etag en cada entidad", async () => {
            await CategoryModel.create({ nombre: "X_EtagColl" });
            const res = await request(app).get("/odata/category-odata");
            expect(res.status).toBe(200);
            const items = res.body.value as Record<string, any>[];
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) expect(item["@odata.etag"]).toEqual(expect.any(String));
        });

        it("GET entidad individual inyecta @odata.etag", async () => {
            const seed = await CategoryModel.create({ nombre: "X_EtagSingle" });
            const res = await request(app).get(`/odata/category-odata/${seed.id}`);
            expect(res.status).toBe(200);
            expect(etagOf(res.body as Record<string, any>)).toEqual(expect.any(String));
        });

        it("$expand anida @odata.etag en la navegación", async () => {
            const cat = await CategoryModel.create({ nombre: "X_EtagNav" });
            const nowNav = new Date();
            await ProductSeq.create({ nombre: "X_ProdNav", precio: 10, categoria: "X_EtagNav", categoriaId: cat.id, createdAt: nowNav, updatedAt: nowNav });
            const res = await request(app).get(`/odata/category-odata?$expand=products`);
            expect(res.status).toBe(200);
            const cats = res.body.value as Record<string, any>[];
            const target = cats.find((c) => c.id === cat.id);
            expect(target).toBeDefined();
            expect(etagOf(target!)).toEqual(expect.any(String));
            const products = target!.products as Record<string, any>[];
            expect(products.length).toBeGreaterThan(0);
            expect(products[0]["@odata.etag"]).toEqual(expect.any(String));
        });

        it("PATCH directo con If-Match correcto actualiza y renueva @odata.etag (200)", async () => {
            const seed = await CategoryModel.create({ nombre: "X_EtagUpd" });
            const getRes = await request(app).get(`/odata/category-odata/${seed.id}`);
            const etag = etagOf(getRes.body as Record<string, any>)!;

            const res = await request(app)
                .patch(`/odata/category-odata/${seed.id}`)
                .set("If-Match", etag)
                .send({ nombre: "X_EtagUpd_Changed" });
            expect(res.status).toBe(200);
            expect(etagOf(res.body as Record<string, any>)).toEqual(expect.any(String));
            expect(etagOf(res.body as Record<string, any>)).not.toBe(etag);
        });

        it("PATCH directo con If-Match incorrecto devuelve 412", async () => {
            const seed = await CategoryModel.create({ nombre: "X_Etag412" });
            const res = await request(app)
                .patch(`/odata/category-odata/${seed.id}`)
                .set("If-Match", "etag-que-no-coincide")
                .send({ nombre: "X_Etag412_Changed" });
            expect(res.status).toBe(412);
        });

        it("DELETE directo con If-Match correcto borra (204)", async () => {
            const seed = await CategoryModel.create({ nombre: "X_EtagDel" });
            const getRes = await request(app).get(`/odata/category-odata/${seed.id}`);
            const etag = etagOf(getRes.body as Record<string, any>)!;

            const res = await request(app)
                .delete(`/odata/category-odata/${seed.id}`)
                .set("If-Match", etag);
            expect(res.status).toBe(204);
            const row = await CategoryModel.findByPk(seed.id);
            expect(row).toBeNull();
        });

        it("DELETE directo con If-Match incorrecto devuelve 412", async () => {
            const seed = await CategoryModel.create({ nombre: "X_EtagDel412" });
            const res = await request(app)
                .delete(`/odata/category-odata/${seed.id}`)
                .set("If-Match", "etag-que-no-coincide");
            expect(res.status).toBe(412);
        });

        it("T: $batch changeset PATCH con If-Match correcto (200)", async () => {
            const seed = await CategoryModel.create({ nombre: "X_BatchUpd" });
            const getRes = await request(app).get(`/odata/category-odata/${seed.id}`);
            const etag = etagOf(getRes.body as Record<string, any>)!;
            const body = buildSapui5Changeset([
                { method: "PATCH", url: `category-odata(${seed.id})`, contentId: "1", body: { nombre: "X_BatchUpd_Changed" }, ifMatch: etag },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5");
            expect(status).toBe(200);
            expect(text).toContain("HTTP/1.1 200 OK");
        });

        it("T: $batch changeset PATCH con If-Match incorrecto (412)", async () => {
            const seed = await CategoryModel.create({ nombre: "X_Batch412" });
            const body = buildSapui5Changeset([
                { method: "PATCH", url: `category-odata(${seed.id})`, contentId: "1", body: { nombre: "X_Batch412_Changed" }, ifMatch: "etag-que-no-coincide" },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5");
            expect(status).toBe(200);
            expect(text).toContain("HTTP/1.1 412 Precondition Failed");
        });
    });

    // G2: los errores se emiten en el formato OData v4 estándar que SAPUI5
    // `MessageManager` sabe parsear: { error: { code, message, target?, details[] } }.
    // Ver docs/14 (Sesión 16, G2).
    describe("G2: errores OData v4 estándar (SAPUI5 MessageManager)", () => {
        const app = expressApp();

        it("PATCH directo a entidad inexistente devuelve 404 con forma estándar", async () => {
            const res = await request(app)
                .patch("/odata/category-odata/999999")
                .send({ nombre: "X_G2_404" });
            expect(res.status).toBe(404);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe("404");
            expect(res.body.error.message).toBe("Entity not found");
            expect(Array.isArray(res.body.error.details)).toBe(true);
        });

        it("PATCH directo con If-Match incorrecto devuelve 412 con details", async () => {
            const seed = await CategoryModel.create({ nombre: "X_G2_412" });
            const res = await request(app)
                .patch(`/odata/category-odata/${seed.id}`)
                .set("If-Match", "etag-que-no-coincide")
                .send({ nombre: "X_G2_412_Changed" });
            expect(res.status).toBe(412);
            expect(res.body.error.code).toBe("412");
            expect(res.body.error.message).toBe("Precondition Failed");
            expect(res.body.error.details[0].message).toBe("ETag mismatch");
        });

        it("$batch changeset PATCH con If-Match incorrecto (412) usa forma estándar en la parte", async () => {
            const seed = await CategoryModel.create({ nombre: "X_G2_Batch412" });
            const body = buildSapui5Changeset([
                { method: "PATCH", url: `category-odata(${seed.id})`, contentId: "1", body: { nombre: "X_G2_Batch412_Changed" }, ifMatch: "etag-que-no-coincide" },
            ]);
            const { status, text } = await postBatch(app, body, "batch_sapui5");
        expect(status).toBe(200);
        const part = firstJson(text);
        expect(part.error).toBeDefined();
        expect(part.error.code).toBe("412");
        expect(part.error.message).toBe("Precondition Failed");
        expect(part.error.details[0].message).toContain("ETag mismatch");
        });
    });
});

