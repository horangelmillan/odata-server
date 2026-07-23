import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { IInvoice } from "../interface/invoice.interface.js";

export class InvoiceCreateDTO implements IInvoice {
    @IsString()
    id!: string;

    @IsString()
    companyId!: string;

    @IsString()
    customerId!: string;

    @IsString()
    fecha!: string;

    @IsNumber()
    @Min(0)
    importe!: number;

    @IsString()
    moneda!: string;

    @IsString()
    estado!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class InvoiceUpdateDTO extends PartialType(OmitType(InvoiceCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    companyId?: string;

    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @IsString()
    fecha?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    importe?: number;

    @IsOptional()
    @IsString()
    moneda?: string;

    @IsOptional()
    @IsString()
    estado?: string;
}
