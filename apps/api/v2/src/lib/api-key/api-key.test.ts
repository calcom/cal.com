import { describe, expect, it } from "vitest";
import { isApiKey, sha256Hash, stripApiKey } from "./index";

describe("api-key utilities", () => {
  describe("sha256Hash", () => {
    it("should produce a consistent hash for the same input", () => {
      const hash1 = sha256Hash("test-key");
      const hash2 = sha256Hash("test-key");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      expect(sha256Hash("key-a")).not.toBe(sha256Hash("key-b"));
    });
  });

  describe("isApiKey", () => {
    it("should return true for keys starting with the given prefix", () => {
      expect(isApiKey("cal_abc123", "cal_")).toBe(true);
    });

    it("should return true for agent keys starting with prefix+agent_", () => {
      expect(isApiKey("cal_agent_abc123", "cal_")).toBe(true);
    });

    it("should return false for keys not starting with the prefix", () => {
      expect(isApiKey("Bearer some-token", "cal_")).toBe(false);
    });
  });

  describe("stripApiKey", () => {
    it("should strip the base prefix from a regular API key", () => {
      expect(stripApiKey("cal_abc123", "cal_")).toBe("abc123");
    });

    it("should strip the agent prefix from an agent API key", () => {
      expect(stripApiKey("cal_agent_abc123", "cal_")).toBe("abc123");
    });

    it("should use default prefix when none is provided", () => {
      expect(stripApiKey("cal_abc123")).toBe("abc123");
    });

    it("should strip default agent prefix when no prefix is provided", () => {
      expect(stripApiKey("cal_agent_abc123")).toBe("abc123");
    });

    it("should work with custom prefixes", () => {
      expect(stripApiKey("custom_abc123", "custom_")).toBe("abc123");
      expect(stripApiKey("custom_agent_abc123", "custom_")).toBe("abc123");
    });

    it("should produce the same raw key for regular and agent keys", () => {
      const rawKey = "abc123def456";
      const regularKey = `cal_${rawKey}`;
      const agentKey = `cal_agent_${rawKey}`;

      expect(stripApiKey(regularKey, "cal_")).toBe(rawKey);
      expect(stripApiKey(agentKey, "cal_")).toBe(rawKey);
    });

    it("should produce matching hashes for regular and agent keys with the same raw key", () => {
      const rawKey = "abc123def456";
      const regularStripped = stripApiKey(`cal_${rawKey}`, "cal_");
      const agentStripped = stripApiKey(`cal_agent_${rawKey}`, "cal_");

      expect(sha256Hash(regularStripped)).toBe(sha256Hash(agentStripped));
    });
  });
});
