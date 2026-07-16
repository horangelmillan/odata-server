import { IsString, IsOptional } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";
import { IGlAccount } from "../interface/glaccount.interface.js";

export class GlAccountCreateDTO implements IGlAccount {
    @IsString()
    id!: string;

    @IsString()
    nombre!: string;

    @IsOptional()
    @IsString()
    createdAt?: Date;

    @IsOptional()
    @IsString()
    updatedAt?: Date;
}

export class GlAccountUpdateDTO extends OmitType(GlAccountCreateDTO, ["id"] as const) {
    @IsOptional()
    @IsString()
    nombre?: string;
}
