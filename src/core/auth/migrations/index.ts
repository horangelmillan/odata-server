import type { KernelMigration } from "../../../common/service/odata/migrations/migrator.js";
import * as authUsers from "./004-auth-users.js";

// F2 (ciclo 16): migraciones del dominio auth. El `name` preserva la identidad
// de `SequelizeMeta` (con extensión, igual que el resolver glob histórico).
export const authMigrations: KernelMigration[] = [
    {
        name: "004-auth-users.ts",
        up: authUsers.up,
        down: authUsers.down,
    },
];
