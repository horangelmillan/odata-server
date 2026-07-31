import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { ISupplierInvoiceItem } from "../interface/supplierinvoiceitem.interface.js";

export class SupplierInvoiceItemCreateDTO implements ISupplierInvoiceItem {
    @IsString()
    id!: string;

    @IsString()
    supplierInvoiceId!: string;

    @IsString()
    glAccountId!: string;

    @IsString()
    material!: string;

    @IsNumber()
    @Min(1)
    cantidad!: number;

    @IsNumber()
    @Min(0)
    importe!: number;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class SupplierInvoiceItemUpdateDTO extends PartialType(OmitType(SupplierInvoiceItemCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    supplierInvoiceId?: string;

    @IsOptional()
    @IsString()
    glAccountId?: string;

    @IsOptional()
    @IsString()
    material?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    cantidad?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    importe?: number;
}
