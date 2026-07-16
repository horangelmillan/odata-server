import { Model, Table, Column, DataTypes, HasMany } from "@phrasecode/odata";
import { SupplierInvoiceOData } from "../../supplierinvoice/model/supplierinvoice.odata.model.js";

@Table({ tableName: "suppliers", timestamps: true })
export class SupplierOData extends Model<SupplierOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.STRING })
    pais!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @HasMany(() => SupplierInvoiceOData, { relation: [{ foreignKey: "supplierId", sourceKey: "id" }] })
    supplierInvoices!: SupplierInvoiceOData[];
}
