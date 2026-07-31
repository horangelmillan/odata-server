import { Request, Response } from "express";
import type { Sequelize } from "sequelize";

// F2 (ciclo 16): `GET /healthz` — liveness público (D6): ping a la BD +
// uptime del proceso. 200 cuando la BD responde, 503 cuando no (el healthcheck
// del compose prod lo usa para cortar tráfico). Recibe un RESOLVER de
// Sequelize (no la instancia) para que el build de la app no dependa de la
// infraestructura (los test doubles de DataSource no exponen sequelize).
export class HealthzMiddleware {
    static handler(resolveSequelize: () => Sequelize) {
        return async (_req: Request, res: Response): Promise<void> => {
            try {
                const sequelize = resolveSequelize();
                await sequelize.authenticate();
                res.json({ status: "ok", db: "up", uptime: process.uptime() });
            } catch {
                res.status(503).json({ status: "degraded", db: "down", uptime: process.uptime() });
            }
        };
    }
}
