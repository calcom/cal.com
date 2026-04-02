import { describe, expect, test } from "vitest";
import { createDomainManager } from "../create-domain-manager";
import { NoOpDomainManager } from "../no-op-domain-manager";
import { VercelDomainManager } from "../vercel-domain-manager";

describe("createDomainManager", () => {
  test("creates VercelDomainManager for provider vercel", () => {
    const manager = createDomainManager({
      provider: "vercel",
      projectId: "prj_test",
      authToken: "tok",
    });
    expect(manager).toBeInstanceOf(VercelDomainManager);
  });

  test("creates VercelDomainManager with optional teamId", () => {
    const manager = createDomainManager({
      provider: "vercel",
      projectId: "prj_test",
      teamId: "team_test",
      authToken: "tok",
    });
    expect(manager).toBeInstanceOf(VercelDomainManager);
  });

  test("creates NoOpDomainManager for provider noop", () => {
    const manager = createDomainManager({ provider: "noop" });
    expect(manager).toBeInstanceOf(NoOpDomainManager);
  });
});
