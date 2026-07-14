import { isDefined, isString, isNumber } from "../../../../common/helper/useful.helper.js";

describe("useful helpers", () => {
    describe("isDefined", () => {
        it("should return true for defined values", () => {
            expect(isDefined(0)).toBe(true);
            expect(isDefined("")).toBe(true);
            expect(isDefined(false)).toBe(true);
            expect(isDefined({})).toBe(true);
        });

        it("should return false for null/undefined", () => {
            expect(isDefined(null)).toBe(false);
            expect(isDefined(undefined)).toBe(false);
        });
    });

    describe("isString", () => {
        it("should return true for strings", () => {
            expect(isString("hello")).toBe(true);
            expect(isString("")).toBe(true);
        });

        it("should return false for non-strings", () => {
            expect(isString(123)).toBe(false);
            expect(isString(null)).toBe(false);
            expect(isString(undefined)).toBe(false);
        });
    });

    describe("isNumber", () => {
        it("should return true for numbers", () => {
            expect(isNumber(123)).toBe(true);
            expect(isNumber(0)).toBe(true);
        });

        it("should return false for non-numbers", () => {
            expect(isNumber("123")).toBe(false);
            expect(isNumber(NaN)).toBe(false);
            expect(isNumber(null)).toBe(false);
        });
    });
});
