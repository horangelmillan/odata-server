import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { CompanyOData } from "../../company/model/company.odata.model.js";
import { CustomerOData } from "../../customer/model/customer.odata.model.js";

@Table({ tableName: "invoices", timestamps: true })
export class InvoiceOData extends Model<InvoiceOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    companyId!: string;

    @Column({ dataType: DataTypes.STRING })
    customerId!: string;

    @Column({ dataType: DataTypes.DATE })
    fecha!: string;

    @Column({ dataType: DataTypes.DECIMAL })
    importe!: number;

    @Column({ dataType: DataTypes.STRING })
    moneda!: string;

    @Column({ dataType: DataTypes.STRING })
    estado!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => CompanyOData, { relation: [{ foreignKey: "id", sourceKey: "companyId" }] })
    company!: CompanyOData;

    @BelongsTo(() => CustomerOData, { relation: [{ foreignKey: "id", sourceKey: "customerId" }] })
    customer!: CustomerOData;
}
