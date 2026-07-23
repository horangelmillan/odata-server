import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { IInvoiceItem } from "../interface/invoiceitem.interface.js";

export class InvoiceItemCreateDTO implements IInvoiceItem {
    @IsString()
    id!: string;

    @IsString()
    invoiceId!: string;

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

export class InvoiceItemUpdateDTO extends PartialType(OmitType(InvoiceItemCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    invoiceId?: string;

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
