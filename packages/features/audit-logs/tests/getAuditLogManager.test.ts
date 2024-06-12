import { test, describe, expect, beforeEach } from "vitest";

import BoxyHQAuditLogManager from "@calcom/app-store/boxyhq-retraced/lib/AuditLogManager";
import GenericAuditLogManager from "@calcom/app-store/templates/audit-log-implementation/lib/AuditLogManager";

import { getAuditLogManager, auditLogImplementationsVault } from "../lib/getAuditLogManager";

describe("getAuditLogManager", () => {
  let fakeCredential;
  beforeEach(() => {
    fakeCredential = {
      id: 1,
      type: "auditLogs",
      key: {
        apiKey: "test",
        projectId: "10",
        endpoint: "localhost:3000",
        disabledEvents: [],
      },
      userId: 1,
      teamId: null,
      appId: "test-auditLog",
      subscriptionId: null,
      paymentStatus: null,
      billingCycleStart: null,
      invalid: false,
      settings: {},
    };
  });

  test("Return genericImplementation when no auditLogManager is found", async () => {
    const auditLogManager = await getAuditLogManager({
      credential: fakeCredential,
    });

    expect(auditLogManager).toBeInstanceOf(GenericAuditLogManager);
  });

  test("Return ex[ected AuditLogManager", async () => {
    fakeCredential.appId = "boxyhq-retraced";
    fakeCredential.key = {
      activeEnvironment: "test",
      endpoint: "localhost:3000",
      projectId: "dev",
      disabledEvents: [],
      environments: {
        test: {
          id: "12354",
          name: "Testing Environment",
          token: "this is a token",
        },
      },
      projectName: "Cal.com",
    };

    const auditLogManager = await getAuditLogManager({
      credential: fakeCredential,
      auditLogImplementations: auditLogImplementationsVault,
    });

    expect(auditLogManager).toBeInstanceOf(BoxyHQAuditLogManager);
  });

  test("Return undefined when given a credential with incompatible type", async () => {
    fakeCredential.type = "test";
    const auditLogManager = await getAuditLogManager({
      credential: fakeCredential,
      auditLogImplementations: auditLogImplementationsVault,
    });

    expect(auditLogManager).toBe(undefined);
  });

  test("Return undefined when given incopatible appKeys", async () => {
    fakeCredential.key = {};
    const auditLogManager = await getAuditLogManager({
      credential: fakeCredential,
      auditLogImplementations: auditLogImplementationsVault,
    });

    expect(auditLogManager).toBe(undefined);
  });
});
