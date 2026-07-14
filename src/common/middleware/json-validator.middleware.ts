import { Request, Response, NextFunction } from "express";
import { transformAndValidate, ClassType } from "class-transformer-validator";
import { BaseDTO } from "../dto/base.dto.js";
import { ValidationError } from "class-validator";
import { JSONValidatorException } from "../exception/json-validator.exception.js";

class ValidatorMiddleware {
    static validateBodyWithDTO<T extends BaseDTO>(dto: ClassType<T>) {
        return async function (req: Request, res: Response, next: NextFunction) {
            try {
                const classObject: T | T[] = await transformAndValidate(dto, req.body, {
                    validator: {
                        validationError: {
                            target: false,
                        },
                        whitelist: true,
                        forbidNonWhitelisted: true,
                    },
                });
                req.dto = classObject;
                next();
            } catch (error: unknown) {
                if (error instanceof Array && error.every((e) => e instanceof ValidationError)) {
                    next(new JSONValidatorException(`Error validando ${dto.name}`, error));
                    return;
                }
                next(error);
            }
        };
    }
}

export { ValidatorMiddleware };
