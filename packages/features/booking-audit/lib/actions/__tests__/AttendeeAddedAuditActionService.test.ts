import { beforeEach, describe, expect, it } from "vitest";
import { AttendeeAddedAuditActionService } from "../AttendeeAddedAuditActionService";
import { verifyDataRequirementsContract } from "./contractVerification";

describe("AttendeeAddedAuditActionService - getDataRequirements contract", () => {
  let service: AttendeeAddedAuditActionService;

  beforeEach(() => {
    service = new AttendeeAddedAuditActionService();
  });

  it("should not access any dbStore methods", async () => {
    const storedData = {
      version: 1,
      fields: {
        attendeeEmails: ["new-attendee@example.com"],
      },
    };

    const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
    expect(errors).toEqual([]);
    expect(accessedData.userUuids.size).toBe(0);
  });
});
