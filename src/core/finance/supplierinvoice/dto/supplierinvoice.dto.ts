import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { ISupplierInvoice } from "../interface/supplierinvoice.interface.js";

export class SupplierInvoiceCreateDTO implements ISupplierInvoice {
    @IsString()
    id!: string;

    @IsString()
    supplierId!: string;

    @IsString()
    fecha!: string;

    @IsOptional()
    @IsString()
    dueDate?: string;

    @IsNumber()
    @Min(0)
    importe!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    netAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    grossAmount?: number;

    @IsOptional()
    @IsString()
    docNumber?: string;

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

export class SupplierInvoiceUpdateDTO extends PartialType(OmitType(SupplierInvoiceCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    supplierId?: string;

    @IsOptional()
    @IsString()
    fecha?: string;

    @IsOptional()
    @IsString()
    dueDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    importe?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    netAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    taxAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    grossAmount?: number;

    @IsOptional()
    @IsString()
    docNumber?: string;

    @IsOptional()
    @IsString()
    moneda?: string;

    @IsOptional()
    @IsString()
    estado?: string;
}
