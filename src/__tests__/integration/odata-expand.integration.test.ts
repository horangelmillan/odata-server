import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Op } from "sequelize";
import request from "supertest";
import type { Express } from "express";
import expressApp from "../../main.js";
import { db } from "../../common/service/ORM/sequelize.service.js";
import { ProductModel } from "../../core/product/model/product.model.js";
import { CategoryModel } from "../../core/category/model/category.model.js";

// --- Helpers Fase H: construir y parsear peticiones $batch de escritura ---

interface BatchOp {
    method: string;
    url: string;
    contentId: string;
    body?: Record<string, unknown>;
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

async function postBatch(app: Express, body: string, boundary = "batch_h"): Promise<{ status: number; text: string }> {
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

// Regresión del pendiente (1) de Sesión 7: el $Endpoint del $metadata debe
// coincidir con la ruta kebab registrada por el router parcheado. No requiere BD.
describe("OData $metadata: naming kebab coherente con la ruta (Fase E)", () => {
    const app = expressApp();

    it("emite $Endpoint en kebab-case igual a la ruta registrada", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const meta = res.body as Record<string, any>;
        expect(meta.entities.ProductOData.$Endpoint).toBe("/product-odata");
        expect(meta.entities.CategoryOData.$Endpoint).toBe("/category-odata");
    });
});

// Fase I: tipos EDM en $metadata y negociación de $format. No requiere BD
// (el $metadata se genera de los modelos y el 415 corta antes de tocar la BD).
describe("OData tipos EDM + $format (Fase I)", () => {
    const app = expressApp();

    it("$metadata tipa precio como Edm.Decimal y las fechas como Edm.DateTimeOffset", async () => {
        const res = await request(app).get("/odata/$metadata");

        expect(res.status).toBe(200);
        const product = (res.body as Record<string, any>).entities.ProductOData;
        expect(product.id.$Type).toBe("Edm.Int32");
        expect(product.precio.$Type).toBe("Edm.Decimal");
        expect(product.createdAt.$Type).toBe("Edm.DateTimeOffset");
        expect(product.updatedAt.$Type).toBe("Edm.DateTimeOffset");
    });

    it("$format=json es aceptado (no 400/415) sobre $metadata", async () => {
        const res = await request(app).get("/odata/$metadata?$format=json");
        expect(res.status).toBe(200);
        expect((res.body as Record<string, any>).entities).toHaveProperty("ProductOData");
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
        await CategoryModel.destroy({ where: {} });
        await ProductModel.destroy({ where: {} });

        const electronics = await CategoryModel.create({ nombre: "Electrónica" });
        const home = await CategoryModel.create({ nombre: "Hogar" });
        electronicId = electronics.id;
        homeId = home.id;

        await ProductModel.create({ nombre: "Laptop", precio: 1500, categoria: "Electrónica", categoriaId: electronicId });
        await ProductModel.create({ nombre: "Mouse", precio: 25, categoria: "Electrónica", categoriaId: electronicId });
        await ProductModel.create({ nombre: "Teclado", precio: 40, categoria: "Electrónica", categoriaId: electronicId });
        await ProductModel.create({ nombre: "Silla", precio: 300, categoria: "Hogar", categoriaId: homeId });
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
        await ProductModel.destroy({ where: { nombre: { [Op.like]: "H\\_%" } } });
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
        expect(text).toContain("Changeset rolled back");
        expect(text).toContain("HTTP/1.1 404 Not Found");

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
        expect(text).not.toContain("Changeset rolled back");
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
});
