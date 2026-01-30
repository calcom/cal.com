import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { AcceptedAuditActionService } from "../AcceptedAuditActionService";

describe("AcceptedAuditActionService - getDataRequirements contract", () => {
  let service: AcceptedAuditActionService;

  beforeEach(() => {
    service = new AcceptedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {},
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
