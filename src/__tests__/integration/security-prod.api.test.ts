import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { env } from "../../common/config/env.config.js";

// F2 (ciclo 16): modo estricto (production) — D2 + DA1. Este archivo fuerza
// NODE_ENV=production ANTES de que se evalúe env.config (vi.hoisted) y apunta
// la config prod a la MISMA base dev (odata_dev) para no tocar datos de
// producción reales. Vitest aísla el registro de módulos por archivo, así que
// el resto de la suite sigue en modo test/dev.
vi.hoisted(() => {
    process.env.NODE_ENV = "production";
    process.env.SECRET_KEY = "x".repeat(40);
    process.env.CORS_ORIGIN = "https://demo.example.com";
    process.env.DB_SSL = "false";
    process.env.DB_HOST = process.env.DEV_HOST || "localhost";
    process.env.DB_PORT = process.env.DEV_PORT || "5432";
    process.env.DB_USERNAME = process.env.DEV_USERNAME || "postgres";
    process.env.DB_PASSWORD = process.env.DEV_PASSWORD || "secret";
    process.env.DB = process.env.DEV_DB || "odata_dev";
});

import expressApp from "../../main.js";
import { createDataSource } from "../../common/service/odata/datasource.js";
import { domainRegistrations } from "../../core/main.js";
import { AuthUserOData } from "../../core/auth/main.js";

const dataSource = createDataSource([...domainRegistrations.map((r) => r.model), AuthUserOData]);
const odataSeq = (dataSource as unknown as { sequelizerAdaptor: { sequelize: any } }).sequelizerAdaptor.sequelize;

const TEST_USER = "admin-test-strict";
const TEST_PASSWORD = "strict-pass-1234";

async function dbReady(): Promise<boolean> {
    try {
        await odataSeq.authenticate();
        return true;
    } catch {
        return false;
    }
}

const dbAvailable = await dbReady();

describe("Security strict mode (F2) — production", () => {
    const app: Express = expressApp(dataSource);
    const Users = odataSeq.models.users;

    beforeAll(async () => {
        if (!dbAvailable) return;
        await odataSeq.sync({ alter: true });
        await Users.destroy({ where: { username: TEST_USER } });
        await Users.create({
            id: `u-${Date.now()}`,
            username: TEST_USER,
            passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
        });
    });

    afterAll(async () => {
        if (!dbAvailable) return;
        await Users.destroy({ where: { username: TEST_USER } });
        delete process.env.NODE_ENV;
        delete process.env.SECRET_KEY;
        delete process.env.CORS_ORIGIN;
        delete process.env.DB_SSL;
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;
        delete process.env.DB_USERNAME;
        delete process.env.DB_PASSWORD;
        delete process.env.DB;
    });

    it("GET /healthz responde 200 SIN token (público, D6)", async () => {
        const res = await request(app).get("/healthz");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
    });

    it("GET /odata/$metadata responde 200 SIN token (público, DA1)", async () => {
        const res = await request(app).get("/odata/$metadata");
        expect(res.status).toBe(200);
    });

    it("GET /odata/product-odata responde 401 SIN token", async () => {
        const res = await request(app).get("/odata/product-odata");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "unauthorized" });
    });

    it("GET /odata/product-odata responde 401 con token inválido", async () => {
        const res = await request(app)
            .get("/odata/product-odata")
            .set("Authorization", "Bearer token-falso");
        expect(res.status).toBe(401);
    });

    it("login emite token y GET /odata/product-odata responde 200 con él", async () => {
        const login = await request(app)
            .post("/auth/login")
            .send({ username: TEST_USER, password: TEST_PASSWORD });
        expect(login.status).toBe(200);
        const payload = jwt.verify(login.body.token, env.jwtSecret) as jwt.JwtPayload;
        expect(payload.sub).toBe(TEST_USER);

        const res = await request(app)
            .get("/odata/product-odata")
            .set("Authorization", `Bearer ${login.body.token}`);
        expect(res.status).toBe(200);
    });

    it("CORS: origen permitido recibe header, origen desconocido no", async () => {
        const allowed = await request(app)
            .get("/odata/product-odata")
            .set("Origin", "https://demo.example.com")
            .set("Authorization", "Bearer token-falso");
        expect(allowed.headers["access-control-allow-origin"]).toBe("https://demo.example.com");

        const blocked = await request(app)
            .get("/odata/product-odata")
            .set("Origin", "https://evil.example")
            .set("Authorization", "Bearer token-falso");
        expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("rate-limit de escrituras activo (headers RateLimit en POST)", async () => {
        const res = await request(app).post("/odata/product-odata").send({});
        expect(res.status).toBe(401); // el limiter corre antes que el auth
        expect(res.headers["ratelimit-limit"]).toBe("100");
    });
});
