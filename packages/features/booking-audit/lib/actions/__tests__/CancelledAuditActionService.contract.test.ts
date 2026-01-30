import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { CancelledAuditActionService } from "../CancelledAuditActionService";

describe("CancelledAuditActionService - getDataRequirements contract", () => {
  let service: CancelledAuditActionService;

  beforeEach(() => {
    service = new CancelledAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        cancellationReason: "User requested cancellation",
        cancelledBy: "user",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
