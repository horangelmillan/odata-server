import { Type } from "./type.interface.js";

export interface MappedType<T> extends Type<T> {
    new (): T;
}
