import MockDataBaseClient from "../../../tests/libs/__mocks__/mockDatabaseClient";

import { addUsers, addEventTypesToDb } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect } from "vitest";

import { createContextInner } from "../server/createContext";
import { createCaller } from "../server/routers/_app";

const testUser = {
  id: 1,
  email: "test@test.com",
  username: "test-user",
};

const setupIndividualCredentialTest = async () => {
  const ctx = await createContextInner({
    locale: "en",
    session: {
      hasValidLicense: true,
      upId: "test-upId",
      user: {
        id: testUser.id,
        profile: {
          id: 1,
          upId: "profile-upid",
          username: testUser.username,
        },
      },
    },
  });

  const caller = createCaller(ctx);

  return caller;
};

const setupCredential = async (credentialInput) => {
  const exampleCredential = {
    id: 123,
    type: "test-credential",
    appId: "test-credential",
    userId: null,
    teamId: null,
  };

  const credential = { ...exampleCredential, ...credentialInput };

  const MockDatabaseClient = new MockDataBaseClient();

  await MockDatabaseClient.writeCredential(credential);

  return credential;
};

describe("deleteCredential", () => {
  describe("individual credentials", () => {
    test("Delete video credential", async () => {
      const caller = await setupIndividualCredentialTest();

      const eventTypes = await addEventTypesToDb([
        {
          id: 1,
          userId: testUser.id,
          locations: [{ type: "integrations:zoom" }],
        },
        {
          id: 2,
          userId: testUser.id,
          locations: [{ type: "integrations:msteams" }],
        },
      ]);

      const MockDatabaseClient = new MockDataBaseClient();

      await MockDatabaseClient.writeApp({
        slug: "zoom",
        categories: ["conferencing"],
        keys: {},
        dirName: "zoom",
        enabled: true,
      });

      await setupCredential({ userId: testUser.id, type: "zoom_video", appId: "zoom" });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });

      const eventTypeQuery = await MockDatabaseClient.getEventTypes(
        eventTypes.map((eventType) => eventType.id)
      );

      // Ensure that the event type with the deleted app was converted back to daily
      const changedEventType = eventTypeQuery.find((eventType) => eventType.id === 1)?.locations;
      expect(changedEventType).toBeDefined();
      expect(changedEventType![0]).toEqual({ type: "integrations:daily" });

      const nonChangedEventType = eventTypeQuery.find((eventType) => eventType.id === 2)?.locations;
      expect(nonChangedEventType).toBeDefined();
      expect(nonChangedEventType![0]).toEqual({ type: "integrations:msteams" });
    });
    test("deleteCredential", async () => {
      const caller = await setupIndividualCredentialTest();

      await setupCredential({ userId: testUser.id });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });
    });
  });
});
