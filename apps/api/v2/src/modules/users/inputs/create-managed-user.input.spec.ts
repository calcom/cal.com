import { plainToClass } from "class-transformer";

import { CreateManagedUserInput } from "./create-managed-user.input";

describe("CreateManagedUserInput", () => {
  it("should lowercase the email", () => {
    const input = { email: "Alice@Example.COM", name: "Alice" };
    const output = plainToClass(CreateManagedUserInput, input);
    expect(output.email).toBe("alice@example.com");
  });

  it("should keep already lowercase email unchanged", () => {
    const input = { email: "alice@example.com", name: "Alice" };
    const output = plainToClass(CreateManagedUserInput, input);
    expect(output.email).toBe("alice@example.com");
  });

  it("should lowercase mixed case email", () => {
    const input = { email: "Bob.Smith@Company.IO", name: "Bob" };
    const output = plainToClass(CreateManagedUserInput, input);
    expect(output.email).toBe("bob.smith@company.io");
  });
});
