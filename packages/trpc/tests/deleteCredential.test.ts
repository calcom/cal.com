import MockDataBaseClient from "../../../tests/libs/__mocks__/mockDatabaseClient";

import {
  addUsers,
  addEventTypesToDb,
  mockNoTranslations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect, beforeEach } from "vitest";

import { AppRepository } from "@calcom/lib/server/repository/app";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";

import { createContextInner } from "../server/createContext";
import { createCaller } from "../server/routers/_app";

const testUser = {
  email: "test@test.com",
  username: "test-user",
  organizationId: null,
};

const setupIndividualCredentialTest = async (userId: number) => {
  const ctx = await createContextInner({
    locale: "en",
    session: {
      hasValidLicense: true,
      upId: "test-upId",
      user: {
        id: userId,
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

  return await CredentialRepository.create({ ...exampleCredential, ...credentialInput });
};

describe("deleteCredential", () => {
  beforeEach(async () => {
    mockNoTranslations();
  });

  describe("individual credentials", () => {
    test("Delete video credential", async () => {
      const user = await UserRepository.create({
        ...testUser,
      });

      const caller = await setupIndividualCredentialTest(user.id);

      const eventTypes = await addEventTypesToDb([
        {
          id: 1,
          userId: user.id,
          locations: [{ type: "integrations:zoom" }],
        },
        {
          id: 2,
          userId: user.id,
          locations: [{ type: "integrations:msteams" }],
        },
      ]);

      await AppRepository.seedApp("zoomvideo");

      await setupCredential({ userId: user.id, type: "zoom_video", appId: "zoom" });

      await caller.viewer.deleteCredential({ id: 123 });

      const eventTypeQuery = await EventTypeRepository.findAllByUserId(user.id);

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
