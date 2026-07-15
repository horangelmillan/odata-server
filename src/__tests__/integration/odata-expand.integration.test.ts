import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import expressApp from "../../main.js";
import { db } from "../../common/service/ORM/sequelize.service.js";
import { ProductModel } from "../../core/product/model/product.model.js";
import { CategoryModel } from "../../core/category/model/category.model.js";

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
});
