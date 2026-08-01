// F2 (ciclo 16): el dominio auth no es un entityset OData (D2): expone el
// router Express de login, montado por el bootstrap en `/auth`.
export { default as authController } from "./controller/auth.controller.js";
export { AuthUserOData } from "./model/user.odata.model.js";
export { authService } from "./service/auth.service.js";
export { authMigrations } from "./migrations/index.js";
