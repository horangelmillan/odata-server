import { IsString, IsOptional } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { ICompany } from "../interface/company.interface.js";

export class CompanyCreateDTO implements ICompany {
    @IsString()
    id!: string;

    @IsString()
    nombre!: string;

    @IsString()
    moneda!: string;

    @IsString()
    pais!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class CompanyUpdateDTO extends PartialType(OmitType(CompanyCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @IsString()
    moneda?: string;

    @IsOptional()
    @IsString()
    pais?: string;
}
