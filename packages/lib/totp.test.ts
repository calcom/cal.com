import { beforeEach, describe, expect, it, vi } from "vitest";

let lastAuthenticatorOpts: Record<string, unknown> | undefined;
let lastTOTPOpts: Record<string, unknown> | undefined;
const mockAuthenticatorCheck = vi.fn();
const mockTOTPCheck = vi.fn();

vi.mock("@otplib/core", () => {
  return {
    Authenticator: class {
      constructor(opts: Record<string, unknown>) {
        lastAuthenticatorOpts = opts;
      }
      check = mockAuthenticatorCheck;
    },
    TOTP: class {
      constructor(opts: Record<string, unknown>) {
        lastTOTPOpts = opts;
      }
      check = mockTOTPCheck;
    },
  };
});

vi.mock("@otplib/plugin-crypto", () => ({
  createDigest: "mockCreateDigest",
  createRandomBytes: "mockCreateRandomBytes",
}));

vi.mock("@otplib/plugin-thirty-two", () => ({
  keyDecoder: "mockKeyDecoder",
  keyEncoder: "mockKeyEncoder",
}));

import { totpAuthenticatorCheck, totpRawCheck } from "./totp";

describe("totpAuthenticatorCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates Authenticator with default window [1, 0]", () => {
    mockAuthenticatorCheck.mockReturnValueOnce(true);

    totpAuthenticatorCheck("123456", "JBSWY3DPEHPK3PXP");

    expect(lastAuthenticatorOpts).toEqual(expect.objectContaining({ window: [1, 0] }));
  });

  it("passes custom window option through", () => {
    mockAuthenticatorCheck.mockReturnValueOnce(true);

    totpAuthenticatorCheck("123456", "JBSWY3DPEHPK3PXP", { window: [2, 1] });

    expect(lastAuthenticatorOpts).toEqual(expect.objectContaining({ window: [2, 1] }));
  });

  it("calls authenticator.check with token and secret", () => {
    mockAuthenticatorCheck.mockReturnValueOnce(true);

    totpAuthenticatorCheck("123456", "JBSWY3DPEHPK3PXP");

    expect(mockAuthenticatorCheck).toHaveBeenCalledWith("123456", "JBSWY3DPEHPK3PXP");
  });

  it("returns the result of authenticator.check", () => {
    mockAuthenticatorCheck.mockReturnValueOnce(false);

    const result = totpAuthenticatorCheck("000000", "JBSWY3DPEHPK3PXP");

    expect(result).toBe(false);
  });
});

describe("totpRawCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates TOTP with default window [1, 0]", () => {
    mockTOTPCheck.mockReturnValueOnce(true);

    totpRawCheck("123456", "48656c6c6f");

    expect(lastTOTPOpts).toEqual(expect.objectContaining({ window: [1, 0] }));
  });

  it("passes custom window option through", () => {
    mockTOTPCheck.mockReturnValueOnce(true);

    totpRawCheck("123456", "48656c6c6f", { window: [3, 2] });

    expect(lastTOTPOpts).toEqual(expect.objectContaining({ window: [3, 2] }));
  });

  it("calls totp.check with token and secret", () => {
    mockTOTPCheck.mockReturnValueOnce(true);

    totpRawCheck("123456", "48656c6c6f");

    expect(mockTOTPCheck).toHaveBeenCalledWith("123456", "48656c6c6f");
  });

  it("returns the result of totp.check", () => {
    mockTOTPCheck.mockReturnValueOnce(false);

    const result = totpRawCheck("000000", "48656c6c6f");

    expect(result).toBe(false);
  });
});
