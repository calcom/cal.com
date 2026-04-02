import { mockCrmApp } from "@calcom/testing/lib/bookingScenario/bookingScenario";
import type { TFunction } from "i18next";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/app-store/salesforce/lib/graphql/SalesforceGraphQLClient", () => ({
  SalesforceGraphQLClient: vi.fn(),
}));
vi.mock("@calcom/app-store/salesforce/lib/CrmService", () => ({
  default: vi.fn(),
}));
vi.mock("@urql/core", () => ({
  Client: vi.fn(),
  cacheExchange: vi.fn(),
  fetchExchange: vi.fn(),
}));
vi.mock("@urql/exchange-retry", () => ({
  retryExchange: vi.fn(),
}));

import { getCrm } from "@calcom/app-store/_utils/getCrm";
import CrmManager from "./crmManager";

// vi.mock("@calcom/app-store/_utils/getCrm");

describe.skip("crmManager tests", () => {
  test("Set crmService if not set", async () => {
    const spy = vi.spyOn(CrmManager.prototype as any, "getCrmService");
    const crmManager = new CrmManager({
      id: 1,
      type: "credential_crm",
      key: {},
      userId: 1,
      teamId: null,
      appId: "crm-app",
      invalid: false,
      user: { email: "test@test.com" },
    });
    expect(crmManager.crmService).toBe(null);

    crmManager.getContacts(["test@test.com"]);

    expect(spy).toBeCalledTimes(1);
  });
  describe("creating events", () => {
    test("If the contact exists, create the event", async () => {
      const tFunc = vi.fn(() => "foo");
      vi.spyOn(getCrm).mockReturnValue({
        getContacts: () => [
          {
            id: "contact-id",
            email: "test@test.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });
      //   This mock is defaulting to non implemented mock return
      const mockedCrmApp = mockCrmApp("salesforce", {
        getContacts: [
          {
            id: "contact-id",
            email: "test@test.com",
          },
        ],
        createContacts: [{ id: "contact-id", email: "test@test.com" }],
      });

      const crmManager = new CrmManager({
        id: 1,
        type: "salesforce_crm",
        key: {
          clientId: "test-client-id",
        },
        userId: 1,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        user: { email: "test@test.com" },
      });

      crmManager.createEvent({
        title: "Test Meeting",
        type: "test-meeting",
        description: "Test Description",
        startTime: Date(),
        endTime: Date(),
        organizer: {
          email: "organizer@test.com",
          name: "Organizer",
          timeZone: "America/New_York",
          language: {
            locale: "en",
            translate: tFunc as TFunction,
          },
        },
        attendees: [
          {
            email: "test@test.com",
            name: "Test",
            timeZone: "America/New_York",
            language: {
              locale: "en",
              translate: tFunc as TFunction,
            },
          },
        ],
      });

      console.log(mockedCrmApp);
    });
  });
});
