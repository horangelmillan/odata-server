import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "../../../common/config/env.config.js";

// F2 (ciclo 16): el servicio de login resuelve el modelo Sequelize de usuarios
// vía `getDataSource()` (mismo patrón que odata-write.service.ts). El modelo
// se mockea; bcrypt se espía (objeto CJS real) para controlar la comparación.
const findOneMock = vi.fn();
vi.mock("../../../common/service/odata/datasource.js", () => ({
    getDataSource: () => ({
        sequelizerAdaptor: {
            sequelize: { models: { users: { findOne: findOneMock } } },
        },
    }),
}));

import { authService } from "../../../core/auth/service/auth.service.js";

describe("authService.login", () => {
    const hash = "$2b$10$hash";

    beforeEach(() => {
        findOneMock.mockReset();
        vi.restoreAllMocks();
    });

    it("devuelve null sin credenciales", async () => {
        expect(await authService.login("", "")).toBeNull();
        expect(findOneMock).not.toHaveBeenCalled();
    });

    it("devuelve null si el usuario no existe", async () => {
        findOneMock.mockResolvedValue(null);
        expect(await authService.login("ghost", "x".repeat(8))).toBeNull();
    });

    it("devuelve null si la password no coincide", async () => {
        findOneMock.mockResolvedValue({ toJSON: () => ({ passwordHash: hash }) });
        const compareSpy = vi.spyOn(bcrypt, "compare") as unknown as {
            mockResolvedValue: (value: boolean) => void;
        };
        compareSpy.mockResolvedValue(false);
        expect(await authService.login("admin", "wrong-pass")).toBeNull();
    });

    it("firma un JWT válido cuando las credenciales son correctas", async () => {
        findOneMock.mockResolvedValue({ toJSON: () => ({ passwordHash: hash }) });
        const compareSpy = vi.spyOn(bcrypt, "compare") as unknown as {
            mockResolvedValue: (value: boolean) => void;
        };
        compareSpy.mockResolvedValue(true);
        const token = await authService.login("admin", "correct-pass");
        expect(typeof token).toBe("string");
        const payload = jwt.verify(token as string, env.jwtSecret) as jwt.JwtPayload;
        expect(payload.sub).toBe("admin");
    });
});
