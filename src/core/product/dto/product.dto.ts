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

    @IsOptional()
    id?: number;
}

export class ProductUpdateDTO extends OmitType(ProductCreateDTO, ["id"] as const) {}
