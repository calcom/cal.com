import MockDataBaseClient from "../../../tests/libs/__mocks__/mockDatabaseClient";

import { addUsers, addEventTypesToDb } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect } from "vitest";

import { AppRepository } from "@calcom/lib/server/repository/app";

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

      await AppRepository.seedApp("zoomvideo");

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
    test("Delete calendar credential", async () => {
      const caller = await setupIndividualCredentialTest();

      const eventTypes = await addEventTypesToDb([
        {
          id: 1,
          userId: testUser.id,
        },
      ]);

      const MockDatabaseClient = new MockDataBaseClient();

      await MockDatabaseClient.writeApp({
        slug: "google-calendar",
        categories: ["calendar"],
        keys: {},
        dirName: "googlecalendar",
        enabled: true,
      });

      const credential = await setupCredential({
        userId: testUser.id,
        type: "google_calendar",
        appId: "google-calendar",
      });

      await MockDatabaseClient.writeDestinationCalendar({
        id: 1,
        integration: "google_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        userId: testUser.id,
        credentialId: credential.id,
      });

      await MockDatabaseClient.writeDestinationCalendar({
        id: 2,
        integration: "google_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        eventTypeId: eventTypes[0].id,
        credentialId: credential.id,
      });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });
    });
    test("deleteCredential", async () => {
      const caller = await setupIndividualCredentialTest();

      await setupCredential({ userId: testUser.id });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });
    });

    // TODO: Add test for payment apps
    // TODO: Add test for event type apps
  });
});
