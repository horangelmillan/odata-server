import Module from "node:module";
import { Type } from "./type.interface.js";

const require = Module.createRequire(import.meta.url);

export function applyIsOptionalDecorator(targetClass: Function, propertyKey: string) {
    if (!isClassValidatorAvailable()) {
        return;
    }
    const classValidator: typeof import("class-validator") = require("class-validator");
    const decoratorFactory = classValidator.IsOptional();
    decoratorFactory(targetClass.prototype, propertyKey);
}

export function inheritValidationMetadata(
    parentClass: Type<any>,
    targetClass: Function,
    isPropertyInherited?: (key: string) => boolean,
) {
    if (!isClassValidatorAvailable()) {
        return;
    }
    try {
        const classValidator: typeof import("class-validator") = require("class-validator");
        const metadataStorage: import("class-validator").MetadataStorage = (classValidator as any)
            .getMetadataStorage
            ? (classValidator as any).getMetadataStorage()
            : classValidator.getFromContainer(classValidator.MetadataStorage);

        const getTargetValidationMetadatasArgs = [parentClass, null!, false, false];
        const targetMetadata: ReturnType<typeof metadataStorage.getTargetValidationMetadatas> = (
            metadataStorage.getTargetValidationMetadatas as Function
        )(...getTargetValidationMetadatasArgs);
        return targetMetadata
            .filter(({ propertyName }) => !isPropertyInherited || isPropertyInherited(propertyName))
            .map((value) => {
                const originalType = Reflect.getMetadata(
                    "design:type",
                    parentClass.prototype,
                    value.propertyName,
                );
                if (originalType) {
                    Reflect.defineMetadata(
                        "design:type",
                        originalType,
                        targetClass.prototype,
                        value.propertyName,
                    );
                }

                metadataStorage.addValidationMetadata({
                    ...value,
                    target: targetClass,
                });
                return value.propertyName;
            });
    } catch (err) {
        console.error(
            `Validation ("class-validator") metadata cannot be inherited for "${parentClass.name}" class.`,
        );
        console.error(err);
    }
}

type TransformMetadataKey =
    | "_excludeMetadatas"
    | "_exposeMetadatas"
    | "_typeMetadatas"
    | "_transformMetadatas";

export function inheritTransformationMetadata(
    parentClass: Type<any>,
    targetClass: Function,
    isPropertyInherited?: (key: string) => boolean,
) {
    if (!isClassTransformerAvailable()) {
        return;
    }
    try {
        const transformMetadataKeys: TransformMetadataKey[] = [
            "_excludeMetadatas",
            "_exposeMetadatas",
            "_transformMetadatas",
            "_typeMetadatas",
        ];
        transformMetadataKeys.forEach((key) =>
            inheritTransformerMetadata(key, parentClass, targetClass, isPropertyInherited),
        );
    } catch (err) {
        console.error(
            `Transformer ("class-transformer") metadata cannot be inherited for "${parentClass.name}" class.`,
        );
        console.error(err);
    }
}

function inheritTransformerMetadata(
    key: TransformMetadataKey,
    parentClass: Type<any>,
    targetClass: Function,
    isPropertyInherited?: (key: string) => boolean,
) {
    let classTransformer: any;
    try {
        classTransformer = require("class-transformer/cjs/storage");
    } catch {
        classTransformer = require("class-transformer/storage");
    }
    const metadataStorage = classTransformer.defaultMetadataStorage;

    while (parentClass && parentClass !== Object) {
        if (metadataStorage[key].has(parentClass)) {
            const metadataMap = metadataStorage[key] as Map<Function, Map<string, any>>;
            const parentMetadata = metadataMap.get(parentClass);

            const targetMetadataEntries: Iterable<[string, any]> = Array.from(
                parentMetadata!.entries(),
            )
                .filter(([key]) => !isPropertyInherited || isPropertyInherited(key))
                .map(([key, metadata]) => {
                    if (Array.isArray(metadata)) {
                        const targetMetadata = metadata.map((item) => ({
                            ...item,
                            target: targetClass,
                        }));
                        return [key, targetMetadata];
                    }
                    return [key, { ...metadata, target: targetClass }];
                });

            if (metadataMap.has(targetClass)) {
                const existingRules = metadataMap.get(targetClass)!.entries();
                metadataMap.set(targetClass, new Map([...existingRules, ...targetMetadataEntries]));
            } else {
                metadataMap.set(targetClass, new Map(targetMetadataEntries));
            }
        }
        parentClass = Object.getPrototypeOf(parentClass);
    }
}

function isClassValidatorAvailable() {
    try {
        require("class-validator");
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

function isClassTransformerAvailable() {
    try {
        require("class-transformer");
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export function inheritPropertyInitializers(
    target: Record<string, any>,
    sourceClass: Type<any>,
    isPropertyInherited = (key: string) => true,
) {
    try {
        const tempInstance = new sourceClass();
        const propertyNames = Object.getOwnPropertyNames(tempInstance);

        propertyNames
            .filter(
                (propertyName) =>
                    typeof tempInstance[propertyName] !== "undefined" &&
                    typeof target[propertyName] === "undefined",
            )
            .filter((propertyName) => isPropertyInherited(propertyName))
            .forEach((propertyName) => {
                target[propertyName] = tempInstance[propertyName];
            });
    } catch {}
}
