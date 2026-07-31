import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import expressApp from "../../main.js";
import { createDataSource } from "../../common/service/odata/datasource.js";
import { domainRegistrations } from "../../core/main.js";
import { AuthUserOData } from "../../core/auth/main.js";
import { env } from "../../common/config/env.config.js";

// F2 (ciclo 16): modo abierto (D2). NODE_ENV=test → sin auth en /odata, pero
// login y /healthz operativos. El modelo de usuarios se compone igual que en
// server.ts (no es un entityset OData).
const dataSource = createDataSource([...domainRegistrations.map((r) => r.model), AuthUserOData]);
const odataSeq = (dataSource as unknown as { sequelizerAdaptor: { sequelize: any } }).sequelizerAdaptor.sequelize;

const TEST_USER = "admin-test-open";
const TEST_PASSWORD = "test-pass-1234";

async function dbReady(): Promise<boolean> {
    try {
        await odataSeq.authenticate();
        return true;
    } catch {
        return false;
    }
}

const dbAvailable = await dbReady();

describe("Security open mode (F2) — dev/test", () => {
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
    });

    it("GET /odata/product-odata responde 200 SIN token (modo abierto)", async () => {
        const res = await request(app).get("/odata/product-odata");
        expect(res.status).toBe(200);
    });

    it("GET /healthz responde 200 con BD up", async () => {
        const res = await request(app).get("/healthz");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.db).toBe("up");
    });

    it("POST /auth/login rechaza credenciales inválidas (401)", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ username: TEST_USER, password: "wrong-pass" });
        expect(res.status).toBe(401);
    });

    it("POST /auth/login emite un JWT verificable", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ username: TEST_USER, password: TEST_PASSWORD });
        expect(res.status).toBe(200);
        const payload = jwt.verify(res.body.token, env.jwtSecret) as jwt.JwtPayload;
        expect(payload.sub).toBe(TEST_USER);
    });
});
