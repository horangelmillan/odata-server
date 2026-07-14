import { MappedType } from "./mapped-type.interface.js";
import { Type } from "./type.interface.js";

export function IntersectionType<A, B>(
    classRefA: Type<A>,
    classRefB: Type<B>,
): MappedType<A & B> {
    abstract class IntersectionClassType {
        constructor() {
            const tempA = new classRefA();
            const tempB = new classRefB();
            Object.assign(this, tempA, tempB);
        }
    }

    return IntersectionClassType as unknown as MappedType<A & B>;
}
