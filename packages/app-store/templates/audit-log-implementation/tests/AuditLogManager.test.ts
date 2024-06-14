import { faker } from "@faker-js/faker";
import { vi, describe, test, expect, beforeAll } from "vitest";

import { createEvent } from "@calcom/features/audit-logs/lib/handleAuditLogTrigger";
import { flattenObject } from "@calcom/features/audit-logs/utils";

import AuditLogManager from "../lib/AuditLogManager";

const mockReportEvent = vi.fn();
vi.mock("@calcom/features/audit-logs/lib/getGenericAuditLogClient", () => ({
  getGenericAuditLogClient: vi.fn().mockImplementation(() => {
    return {
      reportEvent: mockReportEvent,
    };
  }),
}));

let boxyHqAuditLogManager: AuditLogManager;
describe("Generic Audit Log Manager", () => {
  beforeAll(() => {
    boxyHqAuditLogManager = new AuditLogManager(
      {
        activeEnvironment: "test",
        endpoint: "http://localhost:3000",
        projectId: faker.datatype.uuid(),
        disabledEvents: [],
        environments: {
          test: {
            id: faker.datatype.uuid(),
            name: "Testing Environment",
            token: faker.datatype.uuid(),
          },
        },
        projectName: "Cal.com",
      },
      1
    );
  });

  test("intercepts a SYSTEM_MISC trigger and assigns it the proper implementation specific action.", async () => {
    mockReportEvent.mockImplementation((_) => {
      // Retraced SDK returns eventId, which is a number
      return Promise.resolve(1);
    });

    const data = { implementationAction: "IMPLEMENTATION_SPECIFIC_ACTION" };
    const event = {
      ...createEvent("systemMisc", { id: "1", name: "Oliver Q." }, data),
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

    await boxyHqAuditLogManager.reportEvent(event);

    expect(mockReportEvent).toHaveBeenCalledWith({ ...event, action: "IMPLEMENTATION_SPECIFIC_ACTION" });
  });
});
