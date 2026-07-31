import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { env } from "../../../common/config/env.config.js";
import { AuthMiddleware } from "../../../common/middleware/auth.middleware.js";

// F2 (ciclo 16): valida el Bearer JWT; 401 genérico si falta o es inválido.
function buildApp(): express.Express {
    const app = express();
    app.use(AuthMiddleware.requireBearerToken());
    app.get("/", (_req, res) => res.send("ok"));
    return app;
}

const validToken = jwt.sign({ sub: "admin" }, env.jwtSecret);

describe("AuthMiddleware.requireBearerToken", () => {
    it("401 sin header Authorization", async () => {
        const res = await request(buildApp()).get("/");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "unauthorized" });
    });

    it("401 con header que no es Bearer", async () => {
        const res = await request(buildApp()).get("/").set("Authorization", "Basic abc");
        expect(res.status).toBe(401);
    });

    it("401 con token inválido", async () => {
        const res = await request(buildApp())
            .get("/")
            .set("Authorization", "Bearer token-falso");
        expect(res.status).toBe(401);
    });

    it("401 con token firmado con otra clave", async () => {
        const forged = jwt.sign({ sub: "admin" }, "otra-clave-distinta");
        const res = await request(buildApp()).get("/").set("Authorization", `Bearer ${forged}`);
        expect(res.status).toBe(401);
    });

    it("200 con token válido", async () => {
        const res = await request(buildApp())
            .get("/")
            .set("Authorization", `Bearer ${validToken}`);
        expect(res.status).toBe(200);
        expect(res.text).toBe("ok");
    });
});
