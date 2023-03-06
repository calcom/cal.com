jest.mock("@calcom/lib/logger", () => ({
  default: {
    getChildLogger: () => ({
      debug: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    }),
  },
}));

jest.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: () => `{
      "userApiKey": "test"
    }`,
}));

export {};
