import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// F2 (ciclo 16): validación de entorno (R4). `dotenv` se anula para que solo
// cuente `process.env` (el `.env` real trae SECRET_KEY larga y falsearía los
// casos de fail-fast). `vi.resetModules()` en beforeEach fuerza la re-evaluación
// de env.config con el entorno del caso (setup.ts ya la importa una vez).
vi.mock("dotenv", () => ({ config: () => ({}) }));

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
    process.env = { ...ORIGINAL_ENV };
}

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    restoreEnv();
});

async function importEnv(): Promise<typeof import("../../../common/config/env.config.js")> {
    return import("../../../common/config/env.config.js");
}

describe("env.config: fail-fast en producción (R4)", () => {
    it("aborta si SECRET_KEY falta", async () => {
        process.env.NODE_ENV = "production";
        delete process.env.SECRET_KEY;
        process.env.CORS_ORIGIN = "http://localhost:5173";
        await expect(importEnv()).rejects.toThrow(/SECRET_KEY/);
    });

    it("aborta si SECRET_KEY tiene menos de 32 caracteres", async () => {
        process.env.NODE_ENV = "production";
        process.env.SECRET_KEY = "short";
        process.env.CORS_ORIGIN = "http://localhost:5173";
        await expect(importEnv()).rejects.toThrow(/32 caracteres/);
    });

    it("aborta si CORS_ORIGIN falta", async () => {
        process.env.NODE_ENV = "production";
        process.env.SECRET_KEY = "x".repeat(40);
        delete process.env.CORS_ORIGIN;
        await expect(importEnv()).rejects.toThrow(/CORS_ORIGIN/);
    });

    it("acepta configuración completa de producción", async () => {
        process.env.NODE_ENV = "production";
        process.env.SECRET_KEY = "x".repeat(40);
        process.env.CORS_ORIGIN = "https://demo.example.com";
        const env = await importEnv();
        expect(env.env.isProd).toBe(true);
        expect(env.env.jwtSecret).toBe("x".repeat(40));
        expect(env.env.corsOrigin).toBe("https://demo.example.com");
    });
});

describe("env.config: modo abierto en dev/test (D2)", () => {
    it("no aborta sin configuración de seguridad y conserva defaults", async () => {
        process.env.NODE_ENV = "development";
        delete process.env.SECRET_KEY;
        delete process.env.CORS_ORIGIN;
        const env = await importEnv();
        expect(env.env.isProd).toBe(false);
        expect(env.env.jwtSecret).toBe("change-me");
        expect(env.env.corsOrigin).toBeUndefined();
    });
});
