import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

@Table({ tableName: "companies", timestamps: true })
export class CompanyOData extends Model<CompanyOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.STRING })
    moneda!: string;

    @Column({ dataType: DataTypes.STRING })
    pais!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;
}
