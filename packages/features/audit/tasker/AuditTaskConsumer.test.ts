import { describe, expect, it, vi } from "vitest";

import { AuditTaskConsumer } from "./AuditTaskConsumer";

const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const TEST_UUID = "d570cbe7-11ce-4bce-839e-8c94d3f438b4";

function buildValidInput() {
  return {
    actor: { userUuid: TEST_UUID },
    action: "LOGIN",
    source: "WEBAPP",
    targetType: "user",
    targetId: TEST_UUID,
    previousValue: null,
    newValue: null,
    createdAt: Date.now(),
    operationId: "op-1",
    orgId: 1,
    ipHash: null,
    userAgent: null,
    traceId: null,
    impersonatedBy: null,
  };
}

describe("AuditTaskConsumer", () => {
  it("processes a valid payload", async () => {
    const consumer = new AuditTaskConsumer({ log: mockLogger });

    await expect(consumer.processEvent(buildValidInput())).resolves.not.toThrow();
  });
});
