import { describe, expect, test } from "vitest";
import { NoOpDomainManager } from "../no-op-domain-manager";

describe("NoOpDomainManager", () => {
  const manager = new NoOpDomainManager();

  test("register returns success", async () => {
    expect(await manager.register("example.com")).toEqual({ success: true });
  });

  test("unregister returns true", async () => {
    expect(await manager.unregister("example.com")).toBe(true);
  });

  test("getDomainInfo returns unverified domain", async () => {
    const result = await manager.getDomainInfo("example.com");
    expect(result).toEqual({ verified: false });
  });

  test("getConfigStatus returns configured", async () => {
    const result = await manager.getConfigStatus("example.com");
    expect(result).toEqual({ configured: true });
  });

  test("triggerVerification returns unverified", async () => {
    const result = await manager.triggerVerification("example.com");
    expect(result).toEqual({ verified: false });
  });

  test("getDnsConfig returns placeholder values", () => {
    const config = manager.getDnsConfig();
    expect(config).toEqual({
      aRecordIp: "0.0.0.0",
      cnameTarget: "localhost",
      defaultTtl: 0,
    });
  });
});
