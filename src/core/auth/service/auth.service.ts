import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { ModelStatic, Model as SequelizeModel, Sequelize } from "sequelize";
import { getDataSource } from "../../../common/service/odata/datasource.js";
import { env } from "../../../common/config/env.config.js";
import { AuthUserOData } from "../model/user.odata.model.js";

// F2 (ciclo 16): login del dominio auth. Reutiliza el MISMO datasource que el
// kernel (mismo patrón de acceso que odata-write.service.ts): el modelo
// Sequelize real vive en `sequelize.models[tableIdentifier]`.
interface DataSourceInternal {
    sequelizerAdaptor: { sequelize: Sequelize };
}

const TOKEN_TTL_HOURS = Number(process.env.TOKEN_TTL_HOURS) || 8;

class AuthService {
    private userModel(): ModelStatic<SequelizeModel> {
        const ds = getDataSource() as unknown as DataSourceInternal;
        const { tableIdentifier } = AuthUserOData.getMetadata().tableMetadata;
        const sqModel = ds.sequelizerAdaptor.sequelize.models[tableIdentifier];
        if (!sqModel) {
            throw new Error(`Sequelize model for '${tableIdentifier}' not found`);
        }
        return sqModel as ModelStatic<SequelizeModel>;
    }

    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    async login(username: string, password: string): Promise<string | null> {
        if (!username || !password) return null;
        const row = await this.userModel().findOne({ where: { username } });
        if (!row) return null;
        const user = row.toJSON() as { passwordHash: string };
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return jwt.sign({ sub: username }, env.jwtSecret, {
            expiresIn: `${TOKEN_TTL_HOURS}h`,
        });
    }
}

export const authService = new AuthService();
