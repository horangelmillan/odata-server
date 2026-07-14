export function isDefined<T>(value: T | undefined | null): value is T {
    return value !== undefined && value !== null;
}

export function isString(value: any): value is string {
    return typeof value === "string";
}

export function isNumber(value: any): value is number {
    return typeof value === "number" && !isNaN(value);
}
