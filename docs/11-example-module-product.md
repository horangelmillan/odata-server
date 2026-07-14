# 11 — Ejemplo Completo: Módulo Product (REST + OData)

## 11.1 Descripción

Este ejemplo implementa un módulo `product` con:

- **REST API** en `/api/core/products` siguiendo node-modular-monolith (CRUD completo)
- **OData v4** en `/odata/Products` solo lectura con capacidades de query

## 11.2 Estructura del Módulo

```
src/
├── common/service/odata/
│   ├── models/product.odata.model.ts       # Modelo OData @phrasecode/odata
│   └── controllers/product.odata.controller.ts  # Controlador OData
└── core/product/
    ├── main.ts                             # Router del dominio
    ├── route/product.route.ts              # Rutas REST
    ├── controller/product.controller.ts    # Controlador REST
    ├── service/product.service.ts          # Servicio REST
    ├── model/product.model.ts              # Modelo Sequelize
    ├── dto/product.dto.ts                  # DTOs Create/Update
    ├── interface/product.interface.ts      # Interface IProduct
    └── query/product.query.ts              # SQL queries nativas (opcional)
```

## 11.3 Interface IProduct

```typescript
// src/core/product/interface/product.interface.ts
export interface IProduct {
    id?: number;
    nombre: string;
    precio: number;
    categoria: string;
}
```

## 11.4 Modelo Sequelize (REST)

```typescript
// src/core/product/model/product.model.ts
import { Model, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import { db, DataTypes } from "../../../common/service/ORM/sequelize.service.js";
import { IProduct } from "../interface/product.interface.js";

interface ProductModel extends Model<InferAttributes<ProductModel>, InferCreationAttributes<ProductModel>>, IProduct {
    id: CreationOptional<number>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}

const ProductModel = db.define<ProductModel>("Product", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(255), allowNull: false },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria: { type: DataTypes.STRING(100), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "products", timestamps: true });

export { ProductModel };
```

## 11.5 DTOs (Create/Update)

```typescript
// src/core/product/dto/product.dto.ts
import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../common/helper/nestjs/omit-type.helper.js";
import { IProduct } from "../interface/product.interface.js";

export class ProductCreateDTO implements IProduct {
    @IsString()
    nombre!: string;

    @IsNumber()
    @Min(0)
    precio!: number;

    @IsString()
    categoria!: string;
}

export class ProductUpdateDTO extends OmitType(ProductCreateDTO, ["id"] as const) {}
```

## 11.6 Servicio REST

```typescript
// src/core/product/service/product.service.ts
import { BaseService } from "../../../common/interface/base-service.interface.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { ProductModel } from "../model/product.model.js";
import { IProduct } from "../interface/product.interface.js";

class ProductService implements BaseService {
    async findById(id: number): Promise<IProduct | null> {
        return await ProductModel.findOne({ where: { id } });
    }

    async findAll(options: object): Promise<IProduct[]> {
        return await ProductModel.findAll(options);
    }

    async create(data: ProductCreateDTO): Promise<IProduct> {
        return await ProductModel.create(data);
    }

    async update(data: ProductUpdateDTO, id: number): Promise<[affectedCount: number]> {
        return await ProductModel.update(data, { where: { id } });
    }

    async delete(id: number): Promise<number> {
        return await ProductModel.destroy({ where: { id } });
    }
}

const productService: ProductService = new ProductService();
export { productService };
```

## 11.7 Controlador REST

```typescript
// src/core/product/controller/product.controller.ts
import { NextFunction, Request, Response } from "express";
import { getReasonPhrase, StatusCodes } from "http-status-codes";
import { HttpException } from "../../../common/exception/http.exception.js";
import { ApiResponse } from "../../../common/interface/api-response.interface.js";
import { BaseController } from "../../../common/interface/base-controller.interface.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { IProduct } from "../interface/product.interface.js";
import { productService } from "../service/product.service.js";

class ProductController implements BaseController {
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const products: IProduct[] = await productService.findAll({});
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                results: products,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const product = await productService.findById(id);
            if (!product) throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.OK,
                message: getReasonPhrase(StatusCodes.OK),
                result: product,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data: ProductCreateDTO = req.dto as ProductCreateDTO;
            const result = await productService.create(data);
            const response: ApiResponse<IProduct> = {
                statusCode: StatusCodes.CREATED,
                message: "Producto creado exitosamente",
                result,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const existing = await productService.findById(id);
            if (!existing) throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            const data: ProductUpdateDTO = req.dto as ProductUpdateDTO;
            const result = await productService.update(data, id);
            const response: ApiResponse<typeof result> = {
                statusCode: StatusCodes.OK,
                message: "Producto actualizado exitosamente",
                result,
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const existing = await productService.findById(id);
            if (!existing) throw new HttpException(StatusCodes.NOT_FOUND, `Producto ${id} no encontrado`);
            await productService.delete(id);
            const response: ApiResponse<null> = {
                statusCode: StatusCodes.OK,
                message: "Producto eliminado exitosamente",
            };
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
}

const productController: ProductController = new ProductController();
export { productController };
```

## 11.8 Rutas REST

```typescript
// src/core/product/route/product.route.ts
import express, { Router } from "express";
import { ValidatorMiddleware } from "../../../common/middleware/json-validator.middleware.js";
import { productController } from "../controller/product.controller.js";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";

const productRouter: Router = express.Router();

productRouter.get("/", productController.getAll);
productRouter.get("/:id", productController.getById);
productRouter.post("/", ValidatorMiddleware.validateBodyWithDTO(ProductCreateDTO), productController.create);
productRouter.put("/:id", ValidatorMiddleware.validateBodyWithDTO(ProductUpdateDTO), productController.update);
productRouter.delete("/:id", productController.delete);

export { productRouter };
```

## 11.9 Router del Dominio

```typescript
// src/core/product/main.ts
import express, { Router } from "express";
import { productRouter } from "./route/product.route.js";

const ProductRouter: Router = express.Router();
ProductRouter.use("/", productRouter);
export { ProductRouter };
```

## 11.10 Modelo OData (@phrasecode/odata)

```typescript
// src/common/service/odata/models/product.odata.model.ts
import { Model, Table, Column, DataTypes } from "@phrasecode/odata";

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
}
```

## 11.11 Controlador OData

```typescript
// src/common/service/odata/controllers/product.odata.controller.ts
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../models/product.odata.model.js";

export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            allowedMethod: ["get"],
        });
    }

    public async get(query: QueryParser) {
        const params = query.getParams();
        if (!params.top || params.top > 100) {
            query.setTop(100);
        }
        const result = await this.queryable<ProductOData>(query);
        return result;
    }
}
```
