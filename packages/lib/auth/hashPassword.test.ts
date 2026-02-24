import { describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("mocked-hashed-password"),
}));

import { hashPassword } from "./hashPassword";

describe("hashPassword", () => {
  it("returns a hashed password", async () => {
    const result = await hashPassword("myPassword123");
    expect(result).toBe("mocked-hashed-password");
  });

  it("calls bcryptjs hash with the password and salt rounds", async () => {
    const bcryptjs = await import("bcryptjs");
    await hashPassword("testPassword");
    expect(bcryptjs.hash).toHaveBeenCalledWith("testPassword", 12);
  });

  it("returns a different value than the input", async () => {
    const result = await hashPassword("plaintext");
    expect(result).not.toBe("plaintext");
  });
});
