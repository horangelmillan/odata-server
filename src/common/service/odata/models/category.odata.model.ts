import { Model, Table, Column, DataTypes, HasMany } from "@phrasecode/odata";
import { ProductOData } from "./product.odata.model.js";

@Table({ tableName: "categories" })
export class CategoryOData extends Model<CategoryOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    @HasMany(() => ProductOData, { relation: [{ foreignKey: "categoriaId", sourceKey: "id" }] })
    products!: ProductOData[];
}
