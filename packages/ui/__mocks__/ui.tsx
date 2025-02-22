import { vi } from "vitest";

vi.mock("@calcom/ui", async (originalImport) => {
  const original = (await originalImport()) as Record<string, unknown>;
  // Dynamic imports of Components are not supported in Vitest. So, we use the non-lazy version of the components
  return {
    ...original,
    PhoneInput: original.PhoneInputNonLazy,
    AddressInput: original.AddressInputNonLazy,
  };
});

export {};
