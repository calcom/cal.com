import { describe, expect, it } from "vitest";
import type { DisplayBookingAuditLog } from "../BookingAuditViewerService";
import { BookingActivityTimelineBuilder } from "../BookingActivityTimelineBuilder";
import type { BookingActivitySupplementaryData } from "../BookingActivitySupplementaryDataFetcher";

const SYSTEM_ACTOR: DisplayBookingAuditLog["actor"] = {
  id: "actor-1",
  type: "USER",
  userUuid: "user-uuid",
  attendeeId: null,
  name: "Host User",
  createdAt: new Date("2024-01-01T10:00:00.000Z"),
  displayName: "Host User",
  displayEmail: "host@example.com",
  displayAvatar: null,
};

function buildAuditLog(overrides: Partial<DisplayBookingAuditLog> = {}): DisplayBookingAuditLog {
  return {
    id: "audit-1",
    bookingUid: "booking-uid",
    type: "RECORD_CREATED",
    action: "CREATED",
    timestamp: "2024-01-02T10:00:00.000Z",
    createdAt: "2024-01-02T10:00:00.000Z",
    source: "WEBAPP",
    operationId: "op-1",
    actionDisplayTitle: { key: "booking_audit_action.created", params: { host: "Host User" } },
    actor: SYSTEM_ACTOR,
    ...overrides,
  };
}

function buildSupplementaryData(
  overrides: Partial<BookingActivitySupplementaryData> = {}
): BookingActivitySupplementaryData {
  return {
    bookingId: 1,
    bookingUid: "booking-uid",
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-01T10:00:00.000Z"),
    creationSource: "WEBAPP",
    status: "ACCEPTED",
    hasCreatedAuditLog: false,
    reminders: [],
    integrations: [],
    payments: [],
    ...overrides,
  };
}

describe("BookingActivityTimelineBuilder", () => {
  const builder = new BookingActivityTimelineBuilder();

  it("adds synthetic creation event when no CREATED audit log exists", () => {
    const result = builder.build({
      auditLogs: [],
      supplementaryData: buildSupplementaryData(),
    });

    expect(result.some((log) => log.eventKind === "synthetic" && log.action === "CREATED")).toBe(true);
  });

  it("does not add synthetic creation when CREATED audit log exists", () => {
    const result = builder.build({
      auditLogs: [buildAuditLog()],
      supplementaryData: buildSupplementaryData({ hasCreatedAuditLog: true }),
    });

    expect(result.filter((log) => log.eventKind === "synthetic")).toHaveLength(0);
  });

  it("merges reminders, integrations, and payments with audit logs", () => {
    const result = builder.build({
      auditLogs: [buildAuditLog({ action: "RESCHEDULED", timestamp: "2024-01-03T10:00:00.000Z" })],
      supplementaryData: buildSupplementaryData({
        hasCreatedAuditLog: true,
        reminders: [
          {
            id: 10,
            reminderType: "PENDING_BOOKING_CONFIRMATION",
            elapsedMinutes: 1440,
            createdAt: new Date("2024-01-02T12:00:00.000Z"),
          },
        ],
        integrations: [
          {
            id: 20,
            type: "google_calendar",
            uid: "event-123",
            meetingUrl: null,
            meetingId: null,
            externalCalendarId: "cal-1",
            deleted: false,
          },
        ],
        payments: [
          {
            id: 30,
            uid: "pay-uid",
            appId: "stripe",
            amount: 5000,
            fee: 100,
            currency: "usd",
            success: true,
            refunded: false,
            externalId: "pi_123",
            paymentOption: "ON_BOOKING",
          },
        ],
      }),
    });

    expect(result.map((log) => log.eventKind)).toEqual(
      expect.arrayContaining(["audit", "reminder", "integration", "payment"])
    );
    expect(result[0].timestamp).toBe("2024-01-03T10:00:00.000Z");
  });

  it("assigns categories to audit logs", () => {
    const result = builder.build({
      auditLogs: [
        buildAuditLog({ action: "CREATED" }),
        buildAuditLog({ id: "audit-2", action: "ATTENDEE_ADDED" }),
      ],
      supplementaryData: buildSupplementaryData({ hasCreatedAuditLog: true }),
    });

    expect(result.find((log) => log.action === "CREATED")?.category).toBe("creation");
    expect(result.find((log) => log.action === "ATTENDEE_ADDED")?.category).toBe("attendee");
  });
});
