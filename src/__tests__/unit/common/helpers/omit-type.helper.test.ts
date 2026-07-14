import { IsString, IsNumber, validateSync } from "class-validator";
import { OmitType } from "../../../../common/helper/nestjs/omit-type.helper.js";

class BaseDTO {
    @IsString()
    name!: string;

    @IsNumber()
    age!: number;

    id?: number;
}

describe("OmitType", () => {
    it("should create a class that omits specified keys from validation", () => {
        const Omitted = OmitType(BaseDTO, ["age"] as const);

        const instance = new Omitted();
        instance.name = "test";
        (instance as any).age = 30;

        const errors = validateSync(instance);
        const ageErrors = errors.filter((e) => e.property === "age");
        expect(ageErrors.length).toBe(0);
    });

    it("should preserve validation metadata for kept properties", () => {
        const Omitted = OmitType(BaseDTO, ["age"] as const);
        const instance = new Omitted();
        instance.name = 123 as unknown as string;

        const errors = validateSync(instance);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe("name");
    });

    it("should not validate omitted properties", () => {
        const Omitted = OmitType(BaseDTO, ["age"] as const);
        const instance = new Omitted();

        const errors = validateSync(instance);
        const ageErrors = errors.filter((e) => e.property === "age");
        expect(ageErrors.length).toBe(0);
    });
});
