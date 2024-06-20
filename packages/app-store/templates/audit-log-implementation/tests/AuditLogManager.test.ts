import { faker } from "@faker-js/faker";
import { vi, describe, test, expect, beforeAll } from "vitest";

import { createEvent } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger/createEvent";
import { flattenObject } from "@calcom/features/audit-logs/utils";

import { AuditLogSystemTriggerEvents } from "../../../../prisma/enums";
import AuditLogManager from "../lib/AuditLogManager";

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEvent,
    };
  }),
}));

let genericAuditLogManager: AuditLogManager;
describe("Generic Audit Log Manager", () => {
  beforeAll(() => {
    genericAuditLogManager = new AuditLogManager({
      endpoint: "http://localhost:3000",
      projectId: faker.datatype.uuid(),
      apiKey: "Cal.com",
      disabledEvents: [],
    });
  });

  test("intercepts a SYSTEM_MISC trigger and assigns it the proper implementation specific action.", async () => {
    mockReportEvent.mockImplementation((_) => {
      // Retraced SDK returns eventId, which is a number
      return Promise.resolve(1);
    });

    const data = { implementationAction: "IMPLEMENTATION_SPECIFIC_ACTION" };
    const event = {
      ...createEvent(
        AuditLogSystemTriggerEvents.SYSTEM_MISC,
        { id: 1, name: "Oliver Q." },
        data,
        "127.0.0.0"
      ),
      is_anonymous: false,
      is_failure: false,
      group: {
        id: "default",
        name: "default",
      },
      fields: flattenObject(data),
      created: new Date(),
      source_ip: faker.internet.ipv4(),
    };

    await genericAuditLogManager.reportEvent(event);

    expect(mockReportEvent).toHaveBeenCalledWith({ ...event, action: "IMPLEMENTATION_SPECIFIC_ACTION" });
  });
});
