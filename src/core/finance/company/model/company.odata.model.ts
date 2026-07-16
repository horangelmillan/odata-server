import { Model, Table, Column, DataTypes, HasMany } from "@phrasecode/odata";
import { CustomerOData } from "../../customer/model/customer.odata.model.js";

@Table({ tableName: "companies", timestamps: true })
export class CompanyOData extends Model<CompanyOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.STRING })
    moneda!: string;

    @Column({ dataType: DataTypes.STRING })
    pais!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @HasMany(() => CustomerOData, { relation: [{ foreignKey: "companyId", sourceKey: "id" }] })
    customers!: CustomerOData[];
}
