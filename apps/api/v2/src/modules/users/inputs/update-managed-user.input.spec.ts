import { plainToClass } from "class-transformer";

import { UpdateManagedUserInput } from "./update-managed-user.input";

describe("UpdateManagedUserInput", () => {
  it("should lowercase the email", () => {
    const input = { email: "Alice@Example.COM" };
    const output = plainToClass(UpdateManagedUserInput, input);
    expect(output.email).toBe("alice@example.com");
  });

  it("should keep already lowercase email unchanged", () => {
    const input = { email: "alice@example.com" };
    const output = plainToClass(UpdateManagedUserInput, input);
    expect(output.email).toBe("alice@example.com");
  });

  it("should handle undefined email", () => {
    const input = { name: "Alice" };
    const output = plainToClass(UpdateManagedUserInput, input);
    expect(output.email).toBeUndefined();
  });
});
