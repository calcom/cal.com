import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { vi, describe, test, expect } from "vitest";

import { buildCredential } from "@calcom/lib/test/builder";
import { AuditLogBookingTriggerEvents } from "@calcom/prisma/enums";

import { handleAuditLogTrigger } from "../../lib/handleAuditLogTrigger";
import type { Credential } from ".prisma/client";

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getAuditLogManager", () => {
  return {
    getAuditLogManager: vi.fn().mockImplementation(() => {
      return {
        reportEvent: mockReportEvent,
      };
    }),
  };
});

describe("handleAuditLogTriggers", () => {
  test("reports BOOKING_CREATED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_CREATED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        organizer: {
          id: "This is a test",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_CREATED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "This is a test", name: undefined, type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        fields: { "organizer.id": "This is a test" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_CANCELLED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_CANCELLED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "CANCELLED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_CANCELLED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_REQUESTED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_REQUESTED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "REQUESTED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_REQUESTED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_REJECTED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_REJECTED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "REJECTED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_REJECTED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_CONFIRMED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_CONFIRMED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "CONFIRMED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_CONFIRMED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_PAYMENT_INITIATED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_PAYMENT_INITIATED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "CONFIRMED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_PAYMENT_INITIATED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_PAID as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_PAID,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "CONFIRMED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_PAID",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });

  test("reports BOOKING_RESCHEDULED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: any },
    });

    await handleAuditLogTrigger({
      trigger: AuditLogBookingTriggerEvents.BOOKING_RESCHEDULED,
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: {
        status: "RESCHEDULED",
        organizer: {
          id: "test",
          username: "oliverQ",
        },
      },
    });

    expect(mockReportEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { id: 1, name: undefined },
        action: "BOOKING_RESCHEDULED",
        description: "An apiKey was created.",
        crud: "c",
        target: { id: "test", name: "oliverQ", type: "BOOKING" },
        is_anonymous: false,
        is_failure: false,
        group: { id: "default", name: "default" },
        source_ip: "127.0.0.0",
      })
    );
  });
});
