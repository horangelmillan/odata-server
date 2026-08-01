import type { QueryInterface } from "sequelize";
import { DataTypes } from "sequelize";

// F2 (ciclo 16): tabla de usuarios para autenticación JWT (dominio auth).
export async function up({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.createTable("users", {
        id: { type: DataTypes.STRING, primaryKey: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        passwordHash: { type: DataTypes.STRING, allowNull: false },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    });
}

export async function down({ context: qi }: { context: QueryInterface }): Promise<void> {
    await qi.dropTable("users");
}
