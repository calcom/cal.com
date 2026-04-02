import { beforeEach, describe, expect, it } from "vitest";
import { AcceptedAuditActionService } from "../AcceptedAuditActionService";
import { verifyDataRequirementsContract } from "./contractVerification";

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
