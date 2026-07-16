import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { CategoryOData } from "../../../common/service/odata/models/category.odata.model.js";

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

    // Fase I: fechas de auditoría expuestas como Edm.DateTimeOffset (ISO 8601).
    // Sequelize (timestamps) las mantiene; el parche mapToEdmType garantiza que
    // el $metadata las tipa como DateTimeOffset y no como Edm.Date.
    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => CategoryOData, { relation: [{ foreignKey: "id", sourceKey: "categoriaId" }] })
    category!: CategoryOData;
}
