import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";

export function IsDecimalNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "isDecimalNumber",
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return typeof value === "number" && !Number.isInteger(value);
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a decimal number`;
                },
            },
        });
    };
}
