import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { CompanyOData } from "../../company/model/company.odata.model.js";

@Table({ tableName: "customers", timestamps: true })
export class CustomerOData extends Model<CustomerOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.STRING })
    companyId!: string;

    @Column({ dataType: DataTypes.STRING })
    pais!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => CompanyOData, { relation: [{ foreignKey: "id", sourceKey: "companyId" }] })
    company!: CompanyOData;
}
