import { IsString, IsNumber, IsOptional, Min, IsInt } from "class-validator";
import { Transform } from "class-transformer";
import { OmitType } from "../../../common/helper/nestjs/omit-type.helper.js";
import { IProduct } from "../interface/product.interface.js";

const toNumber = ({ value }: { value: unknown }) => {
    if (typeof value === "string" && value.trim() !== "") return Number(value);
    return value;
};

export class ProductCreateDTO implements IProduct {
    @IsString()
    nombre!: string;

    @Transform(toNumber)
    @IsNumber()
    @Min(0)
    precio!: number;

    @IsString()
    categoria!: string;

    @IsOptional()
    @Transform(toNumber)
    @IsInt()
    categoriaId?: number;

    @IsOptional()
    @Transform(toNumber)
    id?: number;
}

export class ProductUpdateDTO extends OmitType(ProductCreateDTO, ["id"] as const) {
    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @Transform(toNumber)
    @IsNumber()
    @Min(0)
    precio?: number;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsOptional()
    @Transform(toNumber)
    @IsInt()
    categoriaId?: number;
}
