import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { SupplierOData } from "../../supplier/model/supplier.odata.model.js";

@Table({ tableName: "supplierinvoices", timestamps: true })
export class SupplierInvoiceOData extends Model<SupplierInvoiceOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    supplierId!: string;

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

    @BelongsTo(() => SupplierOData, { relation: [{ foreignKey: "id", sourceKey: "supplierId" }] })
    supplier!: SupplierOData;
}
