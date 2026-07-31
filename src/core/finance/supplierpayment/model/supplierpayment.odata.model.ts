import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { SupplierInvoiceOData } from "../../supplierinvoice/model/supplierinvoice.odata.model.js";

@Table({ tableName: "supplierpayments", timestamps: true })
export class SupplierPaymentOData extends Model<SupplierPaymentOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    supplierInvoiceId!: string;

    @Column({ dataType: DataTypes.DATE })
    fecha!: string;

    @Column({ dataType: DataTypes.DECIMAL })
    importe!: number;

    @Column({ dataType: DataTypes.STRING })
    metodo!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => SupplierInvoiceOData, { relation: [{ foreignKey: "id", sourceKey: "supplierInvoiceId" }] })
    supplierInvoice!: SupplierInvoiceOData;
}
