import { IsString, IsOptional } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { ICustomer } from "../interface/customer.interface.js";

export class CustomerCreateDTO implements ICustomer {
    @IsString()
    id!: string;

    @IsString()
    nombre!: string;

    @IsString()
    companyId!: string;

    @IsString()
    pais!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class CustomerUpdateDTO extends PartialType(OmitType(CustomerCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    nombre?: string;

    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    pais?: string;
}
