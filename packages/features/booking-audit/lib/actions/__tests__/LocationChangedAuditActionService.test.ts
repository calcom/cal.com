import { beforeEach, describe, expect, it } from "vitest";
import { LocationChangedAuditActionService } from "../LocationChangedAuditActionService";
import { verifyDataRequirementsContract } from "./contractVerification";

describe("LocationChangedAuditActionService - getDataRequirements contract", () => {
  let service: LocationChangedAuditActionService;

  beforeEach(() => {
    service = new LocationChangedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        location: { old: "Office A", new: "Office B" },
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
