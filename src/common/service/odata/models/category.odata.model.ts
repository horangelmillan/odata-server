import { Model, Table, Column, DataTypes, HasMany } from "@phrasecode/odata";
import { ProductOData } from "./product.odata.model.js";

@Table({ tableName: "categories" })
export class CategoryOData extends Model<CategoryOData> {
    @Column({ dataType: DataTypes.INTEGER, isPrimaryKey: true, isAutoIncrement: true })
    id!: number;

    @Column({ dataType: DataTypes.STRING })
    nombre!: string;

    // G1: columnas de auditoría ya existentes en la tabla `categories` (el
    // modelo core las define con timestamps:true). Se mapean aquí para usar
    // `updatedAt` como fuente del `@odata.etag` de concurrencia optimista.
    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @HasMany(() => ProductOData, { relation: [{ foreignKey: "categoriaId", sourceKey: "id" }] })
    products!: ProductOData[];
}
