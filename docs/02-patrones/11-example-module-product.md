# 11 — Ejemplo Completo: Módulo Product (OData-first)

> **Estado:** F1–F5 · OData es el dominio único de `product` (ciclo `refactor/odata-as-domain`).
> El `db.define` de Sequelize fue eliminado; el modelo `@phrasecode/odata` es la única fuente de verdad.
> No hay capa REST: el servidor expone solo `/odata`.

## 11.1 Descripción

Este ejemplo implementa el módulo `product` como **OData-first**:

- **OData v4** en `/odata/product-odata` (lectura + escritura directa), con `$metadata`,
  `$expand=category`, etag y validación de body vía `class-validator`.
- El dominio vive íntegramente en `src/core/demo/product/` con la estructura de carpetas del
  patrón node-modular-monolith (model / controller / service / dto / interface).
- No hay REST (`/api/core/products` fue retirado en F1; la eliminación total de `/api`
  queda en F3).

## 11.2 Estructura del Módulo

```
src/
└── core/demo/product/               # namespace semántico demo/
    ├── main.ts                                # Exporta ProductOData + ProductODataController
    ├── controller/product.odata.controller.ts # Controlador OData (extiende ODataControler)
    ├── service/product.service.ts             # Orquesta lectura+escritura (DTO-validado)
    ├── model/product.odata.model.ts          # Modelo @phrasecode/odata (FUENTE DE VERDAD)
    ├── dto/product.dto.ts                    # DTOs Create/Update (class-validator)
    └── interface/product.interface.ts       # Interface IProduct
```

El registro del dominio en el servidor OData se hace importando desde `core/demo/product/`:

- `src/common/service/odata/datasource.ts` → `ProductOData` (models: [...]).
- `src/common/service/odata/odata.service.ts` → `ProductODataController` (odataControllers).

## 11.3 Interface IProduct

```typescript
// src/core/demo/product/interface/product.interface.ts
export interface IProduct {
    id?: number;
    nombre: string;
    precio: number;
    categoria: string;
    categoriaId?: number;
}
```

## 11.4 Modelo OData (`@phrasecode/odata`) — única fuente de verdad

```typescript
// src/core/demo/product/model/product.odata.model.ts
import { Model, Table, Column, DataTypes, BelongsTo } from "@phrasecode/odata";
import { CategoryOData } from "../../../core/demo/category/model/category.odata.model.js";

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

    // Fase I: fechas de auditoría como Edm.DateTimeOffset (ISO 8601).
    @Column({ dataType: DataTypes.DATE })
    createdAt!: Date;

    @Column({ dataType: DataTypes.DATE })
    updatedAt!: Date;

    @BelongsTo(() => CategoryOData, { relation: [{ foreignKey: "id", sourceKey: "categoriaId" }] })
    category!: CategoryOData;
}
```

> El `db.define("Product", ...)` de Sequelize (antes en `core/demo/product/model/product.model.ts`)
> fue **eliminado** en F1. No hay modelo duplicado.

## 11.5 DTOs (Create/Update)

```typescript
// src/core/demo/product/dto/product.dto.ts
import { IsString, IsNumber, IsOptional, Min, IsInt } from "class-validator";
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

    @IsOptional()
    @IsInt()
    categoriaId?: number;

    @IsOptional()
    id?: number;
}

export class ProductUpdateDTO extends OmitType(ProductCreateDTO, ["id"] as const) {}
```

## 11.6 Controlador OData

```typescript
// src/core/demo/product/controller/product.odata.controller.ts
import { ODataControler, QueryParser } from "@phrasecode/odata";
import { ProductOData } from "../model/product.odata.model.js";

export class ProductODataController extends ODataControler {
    constructor() {
        super({
            model: ProductOData,
            allowedMethod: ["get", "post", "put", "delete"],
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

## 11.7 Servicio OData-first (orquesta lectura + escritura)

El servicio es un singleton que delega la lectura en el `ODataControler` (mismo
`QueryParser` que `/odata/product-odata`) y la escritura en `odataWriteService`
(reusa la instancia Sequelize del `dataSource`, sin duplicar pool). Toda escritura
se valida con los DTOs antes de tocar la BD.

```typescript
// src/core/demo/product/service/product.service.ts
import { transformAndValidate, ClassType } from "class-transformer-validator";
import { ValidationError } from "class-validator";
import { ProductCreateDTO, ProductUpdateDTO } from "../dto/product.dto.js";
import { ProductODataController } from "../controller/product.odata.controller.js";
import { odataWriteService, type ODataBaseModel } from "../../../common/service/odata/odata-write.service.js";
import { JSONValidatorException } from "../../../common/exception/json-validator.exception.js";

function modelOf(controller: ProductODataController): ODataBaseModel {
    return controller.getBaseModel() as unknown as ODataBaseModel;
}

class ProductService {
    private controller = new ProductODataController();

    async findAll(query: unknown) { return await this.controller.get(query as never); }

    async findById(id: number) {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) => odataWriteService.findByPk(model, id, tx));
    }

    async create(data: unknown) {
        const dto = await validate(ProductCreateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.create(model, dto as unknown as Record<string, unknown>, tx));
    }

    async update(id: number, data: unknown) {
        const dto = await validate(ProductUpdateDTO, data);
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) =>
            odataWriteService.update(model, id, dto as unknown as Record<string, unknown>, tx));
    }

    async remove(id: number) {
        const model = modelOf(this.controller);
        return await odataWriteService.runInTransaction((tx) => odataWriteService.remove(model, id, tx));
    }
}

const productService: ProductService = new ProductService();
export { productService };
```

## 11.8 Validación en escritura directa (400 OData)

La ruta de escritura directa (`src/common/service/odata/odata-write.routes.ts`,
registrada por `odata.service.ts`) valida el body con `ProductCreateDTO` /
`ProductUpdateDTO` **antes** de escribir. Si falla, responde `400` en formato
OData v4 estándar (`{ error: { code, message, details } }`):

```typescript
// extracto de odata-write.routes.ts
router.post(base, json, async (req, res) => {
    const body = await validateProductBody(endpoint, req, res, false);
    if (body === null) return; // ya envió 400
    const result = await odataWriteService.runInTransaction((tx) =>
        odataWriteService.create(model, body, tx));
    injectEtag(result.entity);
    res.set("Location", `/odata/${endpoint}(${result.key})`);
    res.status(201).json(result.entity);
});
```

## 11.9 Router del Dominio (exporta model + controller)

```typescript
// src/core/demo/product/main.ts
import { ProductOData } from "./model/product.odata.model.js";
import { ProductODataController } from "./controller/product.odata.controller.js";

export { ProductOData, ProductODataController };
```

## 11.10 Contratos que deben seguir intactos

- `GET|POST|PATCH|DELETE /odata/product-odata` funcionan; escritura inválida → `400` OData.
- `$expand=category`, etag (`@odata.etag`), `$metadata`, `$batch` intactos.
