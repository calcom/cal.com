import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { vi, beforeEach, describe, test } from "vitest";

import { buildCredential } from "@calcom/lib/test/builder";

import { handleAuditLogTrigger } from "../lib/handleAuditLogTrigger";

const mockReportEvent = vi.fn();
vi.mock("@retracedhq/retraced", () => ({
  Client: vi.fn().mockImplementation(() => {
    return { reportEvent: mockReportEvent };
  }),
}));

let fakeCredential;
describe("handleAuditLogTrigger", () => {
  beforeEach(() => {
    fakeCredential = {
      id: 1,
      type: "auditLogs",
      key: {
        apiKey: "test",
        projectId: "10",
        endpoint: "localhost:3000",
        disabledEvents: [],
      },
      userId: 1,
      teamId: null,
      appId: "test-auditLog",
      subscriptionId: null,
      paymentStatus: null,
      billingCycleStart: null,
      invalid: false,
      settings: {},
    };
  });

  test("test is wip", async () => {
    mockReportEvent.mockImplementation((p) => null);

    prismaMock.credential.findMany.mockResolvedValue([
      buildCredential({
        key: {
          activeEnvironment: "test",
          endpoint: "localhost:3000",
          projectId: "dev",
          disabledEvents: [],
          environments: {
            test: {
              id: "12354",
              name: "Testing Environment",
              token: "this is a token",
            },
          },
          projectName: "Cal.com",
        },
      }),
    ]);

    const oldCredential = buildCredential({
      key: {
        activeEnvironment: "test",
        endpoint: "localhost:3000",
        projectId: "dev",
        disabledEvents: [],
        environments: {
          test: {
            id: "12354",
            name: "Testing Environment",
            token: "this is a token",
          },
        },
        projectName: "Cal.com",
      },
    });

    const newCredential = buildCredential({
      key: {
        activeEnvironment: "prod",
        endpoint: "localhost:3000",
        projectId: "dev",
        disabledEvents: [],
        environments: {
          test: {
            id: "12354",
            name: "Testing Environment",
            token: "this is a token",
          },
        },
        projectName: "Cal.com",
      },
    });

    await handleAuditLogTrigger({
      action: "updateAppCredentials",
      user: { id: 1, name: "Oliver Q." },
      source_ip: "127.0.0.0",
      data: { oldCredential, newCredential },
    });

    expect(mockReportEvent).toHaveBeenCalled();
  });
});
