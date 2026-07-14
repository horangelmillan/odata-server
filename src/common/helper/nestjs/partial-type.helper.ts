import { MappedType } from "./mapped-type.interface.js";
import { Type } from "./type.interface.js";
import {
    inheritPropertyInitializers,
    inheritTransformationMetadata,
    inheritValidationMetadata,
    applyIsOptionalDecorator,
} from "./types.helper.js";

export function PartialType<T>(classRef: Type<T>): MappedType<Partial<T>> {
    abstract class PartialClassType {
        constructor() {
            inheritPropertyInitializers(this, classRef);
        }
    }

    const propertyKeys = inheritValidationMetadata(classRef, PartialClassType);
    inheritTransformationMetadata(classRef, PartialClassType);

    if (propertyKeys) {
        propertyKeys.forEach((key) => {
            applyIsOptionalDecorator(PartialClassType, key);
        });
    }

    return PartialClassType as MappedType<Partial<T>>;
}
