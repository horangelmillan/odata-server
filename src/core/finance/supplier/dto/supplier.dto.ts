import { IsString, IsOptional } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { ISupplier } from "../interface/supplier.interface.js";

export class SupplierCreateDTO implements ISupplier {
    @IsString()
    id!: string;

    @IsString()
    nombre!: string;

    @IsString()
    pais!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class SupplierUpdateDTO extends OmitType(SupplierCreateDTO, ["id"] as const) {
    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @IsString()
    pais?: string;
}
