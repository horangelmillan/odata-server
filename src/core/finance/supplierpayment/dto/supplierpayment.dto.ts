import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { ISupplierPayment } from "../interface/supplierpayment.interface.js";

export class SupplierPaymentCreateDTO implements ISupplierPayment {
    @IsString()
    id!: string;

    @IsString()
    supplierInvoiceId!: string;

    @IsString()
    fecha!: string;

    @IsNumber()
    @Min(0)
    importe!: number;

    @IsString()
    metodo!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class SupplierPaymentUpdateDTO extends PartialType(OmitType(SupplierPaymentCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    supplierInvoiceId?: string;

    @IsOptional()
    @IsString()
    fecha?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    importe?: number;

    @IsOptional()
    @IsString()
    metodo?: string;
}
