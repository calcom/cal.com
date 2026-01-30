import { describe, expect, it, beforeEach } from "vitest";
import { verifyDataRequirementsContract } from "./contractVerification";

import { ReassignmentAuditActionService } from "../ReassignmentAuditActionService";
import { CreatedAuditActionService } from "../CreatedAuditActionService";
import { NoShowUpdatedAuditActionService } from "../NoShowUpdatedAuditActionService";
import { CancelledAuditActionService } from "../CancelledAuditActionService";
import { RescheduledAuditActionService } from "../RescheduledAuditActionService";
import { AcceptedAuditActionService } from "../AcceptedAuditActionService";
import { RejectedAuditActionService } from "../RejectedAuditActionService";
import { AttendeeAddedAuditActionService } from "../AttendeeAddedAuditActionService";
import { AttendeeRemovedAuditActionService } from "../AttendeeRemovedAuditActionService";
import { LocationChangedAuditActionService } from "../LocationChangedAuditActionService";
import { RescheduleRequestedAuditActionService } from "../RescheduleRequestedAuditActionService";
import { SeatBookedAuditActionService } from "../SeatBookedAuditActionService";
import { SeatRescheduledAuditActionService } from "../SeatRescheduledAuditActionService";

describe("getDataRequirements contract verification", () => {
  describe("ReassignmentAuditActionService", () => {
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

  describe("CreatedAuditActionService", () => {
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

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
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

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
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

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("NoShowUpdatedAuditActionService", () => {
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

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });

    it("should declare empty userUuids when only attendees are set", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [
            { attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } },
          ],
        },
      };

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });

    it("should declare exactly the userUuids accessed when both host and attendees are set", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: {
            userUuid: "host-uuid-abc",
            noShow: { old: null, new: true },
          },
          attendeesNoShow: [
            { attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } },
          ],
        },
      };

      const { errors } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
    });
  });

  describe("CancelledAuditActionService", () => {
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

  describe("RescheduledAuditActionService", () => {
    let service: RescheduledAuditActionService;

    beforeEach(() => {
      service = new RescheduledAuditActionService();
    });

    it("should not access any dbStore methods", async () => {
      const storedData = {
        version: 1,
        fields: {
          startTime: { old: Date.now(), new: Date.now() + 86400000 },
          endTime: { old: Date.now() + 3600000, new: Date.now() + 90000000 },
          rescheduledToUid: { old: null, new: "new-booking-uid" },
          rescheduledBy: "user",
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
    });
  });

  describe("AcceptedAuditActionService", () => {
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

  describe("RejectedAuditActionService", () => {
    let service: RejectedAuditActionService;

    beforeEach(() => {
      service = new RejectedAuditActionService();
    });

    it("should not access any dbStore methods", async () => {
      const storedData = {
        version: 1,
        fields: {
          rejectionReason: "Schedule conflict",
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
    });
  });

  describe("AttendeeAddedAuditActionService", () => {
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

  describe("AttendeeRemovedAuditActionService", () => {
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

  describe("LocationChangedAuditActionService", () => {
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

  describe("RescheduleRequestedAuditActionService", () => {
    let service: RescheduleRequestedAuditActionService;

    beforeEach(() => {
      service = new RescheduleRequestedAuditActionService();
    });

    it("should not access any dbStore methods", async () => {
      const storedData = {
        version: 1,
        fields: {
          rescheduleReason: "Need to change time",
          rescheduledRequestedBy: "attendee",
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
    });
  });

  describe("SeatBookedAuditActionService", () => {
    let service: SeatBookedAuditActionService;

    beforeEach(() => {
      service = new SeatBookedAuditActionService();
    });

    it("should not access any dbStore methods", async () => {
      const storedData = {
        version: 1,
        fields: {
          seatReferenceUid: "seat-123",
          attendeeEmail: "attendee@example.com",
          attendeeName: "John Doe",
          startTime: Date.now(),
          endTime: Date.now() + 3600000,
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
    });
  });

  describe("SeatRescheduledAuditActionService", () => {
    let service: SeatRescheduledAuditActionService;

    beforeEach(() => {
      service = new SeatRescheduledAuditActionService();
    });

    it("should not access any dbStore methods", async () => {
      const storedData = {
        version: 1,
        fields: {
          seatReferenceUid: "seat-456",
          attendeeEmail: "attendee@example.com",
          startTime: { old: Date.now(), new: Date.now() + 86400000 },
          endTime: { old: Date.now() + 3600000, new: Date.now() + 90000000 },
          rescheduledToBookingUid: { old: null, new: "new-booking-uid" },
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
    });
  });
});
