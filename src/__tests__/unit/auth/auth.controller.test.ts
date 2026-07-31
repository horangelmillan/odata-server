import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// F2 (ciclo 16): el controller de login delega en authService; el router se
// monta tras `express.json()` en el bootstrap.
vi.mock("../../../core/auth/service/auth.service.js", () => ({
    authService: { login: vi.fn() },
}));

import { authService } from "../../../core/auth/service/auth.service.js";
import authController from "../../../core/auth/controller/auth.controller.js";

const loginMock = vi.mocked(authService.login);

function buildApp(): express.Express {
    const app = express();
    app.use(express.json());
    app.use("/auth", authController);
    return app;
}

describe("POST /auth/login", () => {
    beforeEach(() => {
        loginMock.mockReset();
    });

    it("200 con token cuando las credenciales son válidas", async () => {
        loginMock.mockResolvedValue("jwt-token");
        const res = await request(buildApp())
            .post("/auth/login")
            .send({ username: "admin", password: "secret-pass" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ token: "jwt-token" });
        expect(loginMock).toHaveBeenCalledWith("admin", "secret-pass");
    });

    it("401 cuando las credenciales son inválidas", async () => {
        loginMock.mockResolvedValue(null);
        const res = await request(buildApp())
            .post("/auth/login")
            .send({ username: "admin", password: "wrong-pass" });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "invalid credentials" });
    });
});
