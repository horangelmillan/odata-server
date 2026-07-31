import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { SupplierInvoiceOData } from "../../supplierinvoice/model/supplierinvoice.odata.model.js";
import { GlAccountOData } from "../../glaccount/model/glaccount.odata.model.js";

@Table({ tableName: "supplierinvoiceitems", timestamps: true })
export class SupplierInvoiceItemOData extends Model<SupplierInvoiceItemOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    supplierInvoiceId!: string;

    @Column({ dataType: DataTypes.STRING })
    glAccountId!: string;

    @Column({ dataType: DataTypes.STRING })
    material!: string;

    @Column({ dataType: DataTypes.INTEGER })
    cantidad!: number;

    @Column({ dataType: DataTypes.DECIMAL })
    importe!: number;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => SupplierInvoiceOData, { relation: [{ foreignKey: "id", sourceKey: "supplierInvoiceId" }] })
    supplierInvoice!: SupplierInvoiceOData;

    @BelongsTo(() => GlAccountOData, { relation: [{ foreignKey: "id", sourceKey: "glAccountId" }] })
    glAccount!: GlAccountOData;
}
