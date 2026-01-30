import { describe, expect, it, beforeEach } from "vitest";

import { verifyDataRequirementsContract } from "./contractVerification";
import { AttendeeRemovedAuditActionService } from "../AttendeeRemovedAuditActionService";

describe("AttendeeRemovedAuditActionService - getDataRequirements contract", () => {
  let service: AttendeeRemovedAuditActionService;

  beforeEach(() => {
    service = new AttendeeRemovedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        attendeeEmails: ["removed-attendee@example.com"],
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
