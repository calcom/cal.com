import { vi } from "vitest";

vi.mock("@calcom/lib/server/serviceAccountKey", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    decryptServiceAccountKey: vi.fn((input) => {
      // If input is a string, parse it; otherwise, return as is
      if (typeof input === "string") {
        try {
          return JSON.parse(input);
        } catch {
          return input;
        }
      }
      return input;
    }),
  };
});
