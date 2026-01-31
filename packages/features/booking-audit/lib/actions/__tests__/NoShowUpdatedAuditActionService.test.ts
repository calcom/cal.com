import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { NoShowUpdatedAuditActionService } from "../NoShowUpdatedAuditActionService";

describe("NoShowUpdatedAuditActionService - getDataRequirements contract", () => {
  let service: NoShowUpdatedAuditActionService;

  beforeEach(() => {
    service = new NoShowUpdatedAuditActionService();
  });

  it("should declare exactly the userUuids accessed when host is set", async () => {
    const storedData = {
      version: 1,
      fields: {
        host: {
          userUuid: "host-uuid-789",
          noShow: { old: false, new: true },
        },
      },
    };

    const { errors, accessedData} = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(1)
  });

  it("should declare empty userUuids when only attendees are set", async () => {
    const storedData = {
      version: 1,
      fields: {
        attendeesNoShow: [{ attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } }],
      },
    };

    const { errors, accessedData} = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0)
  });

  it("should declare exactly the userUuids accessed when both host and attendees are set", async () => {
    const storedData = {
      version: 1,
      fields: {
        host: {
          userUuid: "host-uuid-abc",
          noShow: { old: null, new: true },
        },
        attendeesNoShow: [{ attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } }],
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(1);
  });
});
