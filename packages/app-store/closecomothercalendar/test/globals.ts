jest.mock("@calcom/lib/logger", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  getChildLogger: jest.fn(),
}));

jest.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: () => `{
      "userApiKey": "test"
    }`,
}));
