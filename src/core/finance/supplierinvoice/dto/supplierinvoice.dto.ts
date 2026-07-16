import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { ISupplierInvoice } from "../interface/supplierinvoice.interface.js";

export class SupplierInvoiceCreateDTO implements ISupplierInvoice {
    @IsString()
    id!: string;

    @IsString()
    supplierId!: string;

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

export class SupplierInvoiceUpdateDTO extends OmitType(SupplierInvoiceCreateDTO, ["id"] as const) {
    @IsOptional()
    @IsString()
    supplierId?: string;

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
