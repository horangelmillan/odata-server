import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { CategoryOData } from "./category.odata.model.js";

@Table({ tableName: "products" })
export class ProductOData extends Model<ProductOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @Column({ dataType: DataTypes.DECIMAL })
    precio!: number;

    @Column({ dataType: DataTypes.STRING })
    categoria!: string;

    @Column({ dataType: DataTypes.INTEGER })
    categoriaId!: number;

    @BelongsTo(() => CategoryOData, { relation: [{ foreignKey: "id", sourceKey: "categoriaId" }] })
    category!: CategoryOData;
}
