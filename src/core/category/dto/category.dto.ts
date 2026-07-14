import { IsString, IsNumber, IsOptional } from "class-validator";
import { OmitType } from "../../../common/helper/nestjs/omit-type.helper.js";
import { ICategory } from "../interface/category.interface.js";

export class CategoryCreateDTO implements ICategory {
    @IsString()
    nombre!: string;

    @IsOptional()
    id?: number;
}

export class CategoryUpdateDTO extends OmitType(CategoryCreateDTO, ["id"] as const) {}
