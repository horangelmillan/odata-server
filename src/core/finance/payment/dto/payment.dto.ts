import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { PartialType } from "../../../../common/helper/nestjs/partial-type.helper.js";
import { IPayment } from "../interface/payment.interface.js";

export class PaymentCreateDTO implements IPayment {
    @IsString()
    id!: string;

    @IsString()
    invoiceId!: string;

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

export class PaymentUpdateDTO extends PartialType(OmitType(PaymentCreateDTO, ["id"] as const)) {
    @IsOptional()
    @IsString()
    invoiceId?: string;

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
