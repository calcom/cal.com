import { vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
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
