import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { ReassignmentAuditActionService } from "../ReassignmentAuditActionService";

describe("ReassignmentAuditActionService - getDataRequirements contract", () => {
  let service: ReassignmentAuditActionService;

  beforeEach(() => {
    service = new ReassignmentAuditActionService();
  });

  it("should declare exactly the userUuids accessed for organizer change", async () => {
    const storedData = {
      version: 1,
      fields: {
        organizerUuid: { old: "organizer-old", new: "organizer-new" },
        reassignmentReason: "Host unavailable",
        reassignmentType: "manual",
      },
    };

    const { errors } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
  });

  it("should declare exactly the userUuids accessed for attendee update", async () => {
    const storedData = {
      version: 1,
      fields: {
        organizerUuid: { old: "fixed-host", new: "fixed-host" },
        hostAttendeeUpdated: {
          id: 123,
          withUserUuid: { old: "old-rr-host", new: "new-rr-host" },
        },
        reassignmentReason: null,
        reassignmentType: "roundRobin",
      },
    };

    const { errors } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
  });
});
