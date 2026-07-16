import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { InvoiceOData } from "../../invoice/model/invoice.odata.model.js";
import { GlAccountOData } from "../../glaccount/model/glaccount.odata.model.js";

@Table({ tableName: "invoiceitems", timestamps: true })
export class InvoiceItemOData extends Model<InvoiceItemOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    invoiceId!: string;

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

    @BelongsTo(() => InvoiceOData, { relation: [{ foreignKey: "id", sourceKey: "invoiceId" }] })
    invoice!: InvoiceOData;

    @BelongsTo(() => GlAccountOData, { relation: [{ foreignKey: "id", sourceKey: "glAccountId" }] })
    glAccount!: GlAccountOData;
}
