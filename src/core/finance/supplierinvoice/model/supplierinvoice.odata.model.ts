import { Model, Table, Column, DataTypes, BelongsTo, HasMany  } from "../../../../common/service/odata/odata-runtime.js";
import { SupplierOData } from "../../supplier/model/supplier.odata.model.js";
import { SupplierInvoiceItemOData } from "../../supplierinvoiceitem/model/supplierinvoiceitem.odata.model.js";
import { SupplierPaymentOData } from "../../supplierpayment/model/supplierpayment.odata.model.js";

@Table({ tableName: "supplierinvoices", timestamps: true })
export class SupplierInvoiceOData extends Model<SupplierInvoiceOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    supplierId!: string;

    @Column({ dataType: DataTypes.DATE })
    fecha!: string;

    @Column({ dataType: DataTypes.DATE })
    dueDate!: string;

    @Column({ dataType: DataTypes.DECIMAL })
    importe!: number;

    @Column({ dataType: DataTypes.DECIMAL })
    netAmount!: number;

    @Column({ dataType: DataTypes.DECIMAL })
    taxAmount!: number;

    @Column({ dataType: DataTypes.DECIMAL })
    grossAmount!: number;

    @Column({ dataType: DataTypes.STRING })
    docNumber!: string;

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

    // DAP2 (ciclo 14): simetría estructural con invoice — items y pagos.
    @HasMany(() => SupplierInvoiceItemOData, { relation: [{ foreignKey: "supplierInvoiceId", sourceKey: "id" }] })
    items!: SupplierInvoiceItemOData[];

    @HasMany(() => SupplierPaymentOData, { relation: [{ foreignKey: "supplierInvoiceId", sourceKey: "id" }] })
    payments!: SupplierPaymentOData[];
}
