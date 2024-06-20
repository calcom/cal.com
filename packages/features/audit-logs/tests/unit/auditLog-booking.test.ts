import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { vi, describe, test, expect } from "vitest";

import { buildCredential } from "@calcom/lib/test/builder";
import { AuditLogBookingTriggerEvents } from "@calcom/prisma/enums";

import { handleAuditLogTrigger } from "../../lib/handleAuditLogTrigger";
import type { Credential, Prisma } from ".prisma/client";

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
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_CREATED",
      })
    );
  });

  test("reports BOOKING_CANCELLED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_CANCELLED",
      })
    );
  });

  test("reports BOOKING_REQUESTED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_REQUESTED",
      })
    );
  });

  test("reports BOOKING_REJECTED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_REJECTED",
      })
    );
  });

  test("reports BOOKING_CONFIRMED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_CONFIRMED",
      })
    );
  });

  test("reports BOOKING_PAYMENT_INITIATED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_PAYMENT_INITIATED",
      })
    );
  });

  test("reports BOOKING_PAID as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,

        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_PAID",
      })
    );
  });

  test("reports BOOKING_RESCHEDULED as expected.", async () => {
    await prismock.credential.create({
      data: buildCredential({
        userId: 1,
        key: {
          endpoint: "localhost:3000",
          projectId: "dev",
          apiKey: "",
          disabledEvents: [],
        },
      }) as Omit<Credential, "key"> & { key: Prisma.InputJsonObject },
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
        action: "BOOKING_RESCHEDULED",
      })
    );
  });
});
