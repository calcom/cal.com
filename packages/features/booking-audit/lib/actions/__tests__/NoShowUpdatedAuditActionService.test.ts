import { beforeEach, describe, expect, it } from "vitest";

import { createMockEnrichmentDataStore, verifyDataRequirementsContract } from "./contractVerification";
import { NoShowUpdatedAuditActionService } from "../NoShowUpdatedAuditActionService";

describe("NoShowUpdatedAuditActionService", () => {
  let service: NoShowUpdatedAuditActionService;

  beforeEach(() => {
    service = new NoShowUpdatedAuditActionService();
  });

  describe("getDataRequirements contract", () => {
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

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(1);
    });

    it("should declare empty userUuids when only attendees are set", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [{ attendeeEmail: "attendee@example.com", noShow: { old: false, new: true } }],
        },
      };

      const { errors, accessedData } = await verifyDataRequirementsContract(service, storedData);
      expect(errors).toEqual([]);
      expect(accessedData.userUuids.size).toBe(0);
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

  describe("getDisplayFields", () => {
    it("should return attendee no-show fields with translationsWithParams using _yes key", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [{ attendeeEmail: "alice@example.com", noShow: { old: false, new: true } }],
        },
      };

      const dbStore = createMockEnrichmentDataStore({ users: [] }, {});
      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.attendees",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.attendee_no_show_status_yes",
                params: { email: "alice@example.com" },
              },
            ],
          },
        },
      ]);
    });

    it("should return attendee no-show fields with _no key when noShow is false", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [
            { attendeeEmail: "bob@example.com", noShow: { old: true, new: false } },
          ],
        },
      };

      const dbStore = createMockEnrichmentDataStore({ users: [] }, {});
      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.attendees",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.attendee_no_show_status_no",
                params: { email: "bob@example.com" },
              },
            ],
          },
        },
      ]);
    });

    it("should return multiple attendee entries with correct keys per attendee", async () => {
      const storedData = {
        version: 1,
        fields: {
          attendeesNoShow: [
            { attendeeEmail: "alice@example.com", noShow: { old: false, new: true } },
            { attendeeEmail: "bob@example.com", noShow: { old: true, new: false } },
          ],
        },
      };

      const dbStore = createMockEnrichmentDataStore({ users: [] }, {});
      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.attendees",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.attendee_no_show_status_yes",
                params: { email: "alice@example.com" },
              },
              {
                key: "booking_audit_action.attendee_no_show_status_no",
                params: { email: "bob@example.com" },
              },
            ],
          },
        },
      ]);
    });

    it("should return host no-show field with _yes key when host marked as no-show", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: {
            userUuid: "host-uuid",
            noShow: { old: false, new: true },
          },
        },
      };

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [{ id: 1, uuid: "host-uuid", name: "Host Name", email: "host@example.com", avatarUrl: null }],
        },
        { userUuids: ["host-uuid"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.host",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.host_no_show_status_yes",
                params: { name: "Host Name" },
              },
            ],
          },
        },
      ]);
    });

    it("should return host no-show field with _no key when no-show cleared", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: {
            userUuid: "host-uuid",
            noShow: { old: true, new: false },
          },
        },
      };

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [{ id: 1, uuid: "host-uuid", name: "Host Name", email: "host@example.com", avatarUrl: null }],
        },
        { userUuids: ["host-uuid"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.host",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.host_no_show_status_no",
                params: { name: "Host Name" },
              },
            ],
          },
        },
      ]);
    });

    it("should use 'Unknown' for host name when user not found", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: {
            userUuid: "missing-uuid",
            noShow: { old: false, new: true },
          },
        },
      };

      const dbStore = createMockEnrichmentDataStore(
        { users: [] },
        { userUuids: ["missing-uuid"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toEqual([
        {
          labelKey: "booking_audit_action.host",
          fieldValue: {
            type: "translationsWithParams",
            valuesWithParams: [
              {
                key: "booking_audit_action.host_no_show_status_yes",
                params: { name: "Unknown" },
              },
            ],
          },
        },
      ]);
    });

    it("should return both attendee and host fields when both are set", async () => {
      const storedData = {
        version: 1,
        fields: {
          host: {
            userUuid: "host-uuid",
            noShow: { old: null, new: true },
          },
          attendeesNoShow: [
            { attendeeEmail: "alice@example.com", noShow: { old: false, new: true } },
          ],
        },
      };

      const dbStore = createMockEnrichmentDataStore(
        {
          users: [{ id: 1, uuid: "host-uuid", name: "Host Name", email: "host@example.com", avatarUrl: null }],
        },
        { userUuids: ["host-uuid"] }
      );

      const result = await service.getDisplayFields({ storedData, dbStore });

      expect(result).toHaveLength(2);
      expect(result[0].labelKey).toBe("booking_audit_action.attendees");
      expect(result[0].fieldValue.type).toBe("translationsWithParams");
      expect(result[1].labelKey).toBe("booking_audit_action.host");
      expect(result[1].fieldValue.type).toBe("translationsWithParams");
    });
  });
});
