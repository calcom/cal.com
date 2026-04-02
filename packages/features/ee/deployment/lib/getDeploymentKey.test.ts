import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDeploymentKey, getDeploymentSignatureToken } from "./getDeploymentKey";

// Mock the crypto module
vi.mock("@calcom/lib/crypto", () => ({
  symmetricDecrypt: vi.fn((text: string, key: string) => {
    if (!key) return null;
    return text.replace("encrypted:", "");
  }),
  symmetricEncrypt: vi.fn((text: string, key: string) => `encrypted:${text}`),
}));

describe("getDeploymentKey", () => {
  const mockDeploymentRepo = {
    getLicenseKeyWithId: vi.fn(),
    getSignatureToken: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    // Set required environment variables
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("getDeploymentKey", () => {
    it("should return license key from environment variable if set", async () => {
      vi.stubEnv("CALCOM_LICENSE_KEY", "test-license-key");
      const result = await getDeploymentKey(mockDeploymentRepo);
      expect(result).toBe("test-license-key");
      expect(mockDeploymentRepo.getLicenseKeyWithId).not.toHaveBeenCalled();
    });

    it("should return license key from repository if environment variable not set", async () => {
      mockDeploymentRepo.getLicenseKeyWithId.mockResolvedValue("db-license-key");
      const result = await getDeploymentKey(mockDeploymentRepo);
      expect(result).toBe("db-license-key");
      expect(mockDeploymentRepo.getLicenseKeyWithId).toHaveBeenCalledWith(1);
    });

    it("should return empty string if no license key found", async () => {
      mockDeploymentRepo.getLicenseKeyWithId.mockResolvedValue(null);
      const result = await getDeploymentKey(mockDeploymentRepo);
      expect(result).toBe("");
      expect(mockDeploymentRepo.getLicenseKeyWithId).toHaveBeenCalledWith(1);
    });
  });

  describe("getDeploymentSignatureToken", () => {
    const ENCRYPTION_KEY = "test-encryption-key";

    beforeEach(() => {
      vi.stubEnv("CALENDSO_ENCRYPTION_KEY", ENCRYPTION_KEY);
    });

    it("should return signature token from environment variable if set", async () => {
      vi.stubEnv("CAL_SIGNATURE_TOKEN", "test-signature-token");
      const result = await getDeploymentSignatureToken(mockDeploymentRepo);
      expect(result).toBe("test-signature-token");
      expect(mockDeploymentRepo.getSignatureToken).not.toHaveBeenCalled();
    });

    it("should decrypt and return signature token from repository if environment variable not set", async () => {
      const encryptedToken = "encrypted:test-token";
      mockDeploymentRepo.getSignatureToken.mockResolvedValue(encryptedToken);

      const result = await getDeploymentSignatureToken(mockDeploymentRepo);
      expect(result).toBe("test-token");
      expect(mockDeploymentRepo.getSignatureToken).toHaveBeenCalledWith(1);
    });

    it("should return null if no signature token found", async () => {
      mockDeploymentRepo.getSignatureToken.mockResolvedValue(null);
      const result = await getDeploymentSignatureToken(mockDeploymentRepo);
      expect(result).toBeNull();
      expect(mockDeploymentRepo.getSignatureToken).toHaveBeenCalledWith(1);
    });

    it("should return null when decryption fails due to missing encryption key", async () => {
      vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "");
      const encryptedToken = "encrypted:test-token";
      mockDeploymentRepo.getSignatureToken.mockResolvedValue(encryptedToken);

      const result = await getDeploymentSignatureToken(mockDeploymentRepo);
      expect(result).toBeNull();
    });

    it("should attempt to decrypt any token format", async () => {
      const token = "invalid-token";
      mockDeploymentRepo.getSignatureToken.mockResolvedValue(token);

      const result = await getDeploymentSignatureToken(mockDeploymentRepo);
      expect(result).toBe("invalid-token"); // The mock decrypt just returns the input if key exists
    });
  });
});
