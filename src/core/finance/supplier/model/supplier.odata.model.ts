import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

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
}
