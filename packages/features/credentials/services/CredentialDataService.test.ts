import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/lib/crypto/keyring", () => ({
  encryptSecret: vi.fn(),
}));

import { encryptSecret } from "@calcom/lib/crypto/keyring";
import { buildCredentialCreateData } from "./CredentialDataService";

const mockedEncryptSecret: ReturnType<typeof vi.mocked<typeof encryptSecret>> = vi.mocked(encryptSecret);

describe("buildCredentialCreateData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("scenario 1: returns data with encryptedKey when encryption succeeds", () => {
    const envelope = {
      v: 1 as const,
      alg: "AES-256-GCM" as const,
      ring: "CREDENTIALS" as const,
      kid: "K1",
      nonce: "abc",
      ct: "encrypted",
      tag: "tag",
    };
    mockedEncryptSecret.mockReturnValue(envelope);

    const input = {
      type: "google_calendar",
      key: { access_token: "tok123" },
      userId: 1,
      appId: "google-calendar",
    };

    const result = buildCredentialCreateData(input);

    expect(result.encryptedKey).toBe(JSON.stringify(envelope));
    expect(result.type).toBe("google_calendar");
    expect(result.key).toEqual({ access_token: "tok123" });
    expect(result.userId).toBe(1);
    expect(result.appId).toBe("google-calendar");
    expect(mockedEncryptSecret).toHaveBeenCalledWith({
      ring: "CREDENTIALS",
      plaintext: JSON.stringify(input.key),
      aad: { type: "google_calendar" },
    });
  });

  test("scenario 2: returns data without encryptedKey when encryption fails", () => {
    mockedEncryptSecret.mockImplementation(() => {
      throw new Error("Keyring not configured");
    });

    const input = {
      type: "zoom_video",
      key: { token: "abc" },
      userId: 2,
      appId: "zoom",
    };

    const result = buildCredentialCreateData(input);

    expect(result.encryptedKey).toBeUndefined();
    expect(result.type).toBe("zoom_video");
    expect(result.key).toEqual({ token: "abc" });
    expect(result.userId).toBe(2);
    expect(result.appId).toBe("zoom");
  });

  test("scenario 3: all input fields are passed through in the returned object", () => {
    const envelope = {
      v: 1 as const,
      alg: "AES-256-GCM" as const,
      ring: "CREDENTIALS" as const,
      kid: "K1",
      nonce: "n",
      ct: "c",
      tag: "t",
    };
    mockedEncryptSecret.mockReturnValue(envelope);

    const input = {
      type: "stripe_payment",
      key: { secret_key: "sk_test_123" },
      userId: 10,
      appId: "stripe",
    };

    const result = buildCredentialCreateData(input);

    expect(result).toEqual({
      type: "stripe_payment",
      key: { secret_key: "sk_test_123" },
      userId: 10,
      appId: "stripe",
      encryptedKey: JSON.stringify(envelope),
    });
  });

  test("scenario 4: optional delegationCredentialId is included in returned object", () => {
    mockedEncryptSecret.mockImplementation(() => {
      throw new Error("Keyring not configured");
    });

    const input = {
      type: "google_calendar",
      key: { refresh_token: "rt" },
      userId: 5,
      appId: "google-calendar",
      delegationCredentialId: "deleg-abc-123",
    };

    const result = buildCredentialCreateData(input);

    expect(result.delegationCredentialId).toBe("deleg-abc-123");
    expect(result.type).toBe("google_calendar");
    expect(result.userId).toBe(5);
    expect(result.appId).toBe("google-calendar");
    expect(result.encryptedKey).toBeUndefined();
  });
});
