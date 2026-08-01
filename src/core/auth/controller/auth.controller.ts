import { Router } from "express";
import { authService } from "../service/auth.service.js";

// F2 (ciclo 16): `POST /auth/login` es la única entrada de autenticación. Es
// público en todos los entornos; en dev/test (modo abierto) no se exige usarlo.
const router: Router = Router();

router.post("/login", async (req, res) => {
    const { username = "", password = "" } = (req.body ?? {}) as {
        username?: string;
        password?: string;
    };
    const token = await authService.login(username, password);
    if (!token) {
        res.status(401).json({ error: "invalid credentials" });
        return;
    }
    res.json({ token });
});

export default router;
