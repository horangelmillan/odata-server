import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { db, DataTypes } from "../../../common/service/ORM/sequelize.service.js";
import { IProduct } from "../interface/product.interface.js";

interface ProductModel extends Model<InferAttributes<ProductModel>, InferCreationAttributes<ProductModel>>, IProduct {
    id: CreationOptional<number>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

const ProductModel = db.define<ProductModel>("Product", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    precio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: "products",
    timestamps: true,
});

export { ProductModel };
