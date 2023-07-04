import { vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getChildLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: () => `{
      "userApiKey": "test"
    }`,
}));

export {};
