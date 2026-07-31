import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

// F2 (ciclo 16): modelo de usuarios del dominio auth. NO es un entityset OData
// (no hay controlador OData): solo da soporte al login (`/auth/login`). La
// tabla se crea vía migración 004 y se sincroniza en dev por el datasource.
@Table({ tableName: "users", timestamps: true })
export class AuthUserOData extends Model<AuthUserOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING, isUnique: true })
    username!: string;

    @Column({ dataType: DataTypes.STRING })
    passwordHash!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;
}
