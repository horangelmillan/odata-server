import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { InvoiceOData } from "../../invoice/model/invoice.odata.model.js";

@Table({ tableName: "payments", timestamps: true })
export class PaymentOData extends Model<PaymentOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    invoiceId!: string;

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

    @BelongsTo(() => InvoiceOData, { relation: [{ foreignKey: "id", sourceKey: "invoiceId" }] })
    invoice!: InvoiceOData;
}
