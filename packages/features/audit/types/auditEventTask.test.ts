import { describe, expect, it } from "vitest";
import { AuditEventTaskPayloadSchema } from "./auditEventTask";

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

describe("AuditEventTaskPayloadSchema", () => {
  it("accepts valid input and derives classification fields", () => {
    const result = AuditEventTaskPayloadSchema.safeParse(buildValidInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("SECURITY");
      expect(result.data.visibility).toBe("CUSTOMER_VISIBLE");
      expect(result.data.sensitivityLevel).toBe("PSEUDONYMIZED");
    }
  });

  it("rejects invalid action", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), action: "INVALID_ACTION" });
    expect(result.success).toBe(false);
  });

  it("rejects incomplete payload", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ action: "LOGIN" });
    expect(result.success).toBe(false);
  });

  it("rejects targetType without targetId", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), targetId: null });
    expect(result.success).toBe(false);
  });

  it("rejects empty operationId", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), operationId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative timestamp", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), createdAt: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer timestamp", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), createdAt: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID in actor", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({
      ...buildValidInput(),
      actor: { userUuid: "not-a-uuid" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects UNKNOWN source", () => {
    const result = AuditEventTaskPayloadSchema.safeParse({ ...buildValidInput(), source: "UNKNOWN" });
    expect(result.success).toBe(false);
  });
});
