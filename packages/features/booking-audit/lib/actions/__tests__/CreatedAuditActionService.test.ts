import { beforeEach, describe, expect, it } from "vitest";
import { CreatedAuditActionService } from "../CreatedAuditActionService";
import { verifyDataRequirementsContract } from "./contractVerification";

describe("CreatedAuditActionService - getDataRequirements contract", () => {
  let service: CreatedAuditActionService;

  beforeEach(() => {
    service = new CreatedAuditActionService();
  });

  it("should declare exactly the userUuids accessed when hostUserUuid is present", async () => {
    const storedData = {
      version: 1,
      fields: {
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: "ACCEPTED",
        hostUserUuid: "host-uuid-123",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(1);
  });

  it("should declare empty userUuids when hostUserUuid is null", async () => {
    const storedData = {
      version: 1,
      fields: {
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: "ACCEPTED",
        hostUserUuid: null,
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });

  it("should declare exactly the userUuids accessed for seated booking", async () => {
    const storedData = {
      version: 1,
      fields: {
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: "ACCEPTED",
        hostUserUuid: "host-uuid-456",
        seatReferenceUid: "seat-ref-123",
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(1);
  });
});
