import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

@Table({ tableName: "glaccounts", timestamps: true })
export class GlAccountOData extends Model<GlAccountOData> {
    @Column({ dataType: DataTypes.STRING, isPrimaryKey: true })
    id!: string;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;
}
