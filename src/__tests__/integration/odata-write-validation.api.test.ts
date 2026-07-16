import { describe, it, expect } from "vitest";
import request from "supertest";

// La validación DTO de escritura directa vive en `odata-write.routes.ts` y ocurre
// ANTES de tocar la BD, así que este test no necesita Postgres: el `dataSource`
// sólo define los modelos Sequelize (sin conexión) al importar la app.
// Ver docs/05-refactor-odata-as-domain/fases/f1-*.md §2.6.
import expressApp from "../../main.js";

describe("OData escritura directa: validación DTO (F1)", () => {
    const app = () => expressApp();

    it("POST /odata/demo/product-odata con body inválido -> 400 OData v4", async () => {
        // Faltan `nombre` y `categoria`; `precio` es negativo e inválido.
        const res = await request(app())
            .post("/odata/demo/product-odata")
            .send({ precio: -5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("400");
        expect(typeof res.body.error.message).toBe("string");
    });

    it("POST /odata/demo/product-odata con campo extra no permitido -> 400 OData v4", async () => {
        const res = await request(app())
            .post("/odata/demo/product-odata")
            .send({
                nombre: "Test",
                precio: 100,
                categoria: "Test",
                extraField: "not-allowed",
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });

    it("PATCH /odata/demo/product-odata/:id con body inválido -> 400 OData v4", async () => {
        const res = await request(app())
            .patch("/odata/demo/product-odata/1")
            .send({ precio: "not-a-number" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });
});

describe("OData escritura directa: validación DTO (F2)", () => {
    const app = () => expressApp();

    it("POST /odata/demo/category-odata con body inválido -> 400 OData v4", async () => {
        // Falta `nombre`; campo requerido por CategoryCreateDTO.
        const res = await request(app())
            .post("/odata/demo/category-odata")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe("400");
        expect(typeof res.body.error.message).toBe("string");
    });

    it("POST /odata/demo/category-odata con campo extra no permitido -> 400 OData v4", async () => {
        const res = await request(app())
            .post("/odata/demo/category-odata")
            .send({ nombre: "Test", extraField: "not-allowed" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });

    it("PATCH /odata/demo/category-odata/:id con body inválido -> 400 OData v4", async () => {
        const res = await request(app())
            .patch("/odata/demo/category-odata/1")
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("400");
    });
});
