import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";

// F2 (ciclo 16): autenticación Bearer JWT para el modo estricto (production).
// Dev/test (modo abierto, D2) no montan este middleware. Respuesta 401 genérica
// para no filtrar el motivo del rechazo.
export class AuthMiddleware {
    static requireBearerToken() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const header = req.headers.authorization;
            if (!header?.startsWith("Bearer ")) {
                res.status(401).json({ error: "unauthorized" });
                return;
            }
            try {
                jwt.verify(header.slice(7), env.jwtSecret);
                next();
            } catch {
                res.status(401).json({ error: "unauthorized" });
            }
        };
    }
}
