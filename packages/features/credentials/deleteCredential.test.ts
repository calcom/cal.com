import {
  addEventTypesToDb,
  mockNoTranslations,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect, beforeEach } from "vitest";

import { AppRepository } from "@calcom/lib/server/repository/app";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { UserRepository } from "@calcom/lib/server/repository/user";

const testUser = {
  email: "test@test.com",
  username: "test-user",
  organizationId: null,
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
      const handleDeleteCredential = (await import("./handleDeleteCredential")).default;

      const user = await UserRepository.create({
        ...testUser,
      });

      await addEventTypesToDb([
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

      await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: 123 });
      const eventTypeQuery = await EventTypeRepository.findAllByUserId({ userId: user.id });

      // Ensure that the event type with the deleted app was converted back to daily
      const changedEventType = eventTypeQuery.find((eventType) => eventType.id === 1)?.locations;
      expect(changedEventType).toBeDefined();
      expect(changedEventType![0]).toEqual({ type: "integrations:daily" });

      const nonChangedEventType = eventTypeQuery.find((eventType) => eventType.id === 2)?.locations;
      expect(nonChangedEventType).toBeDefined();
      expect(nonChangedEventType![0]).toEqual({ type: "integrations:msteams" });
    });
    test("Delete calendar credential", async () => {
      const handleDeleteCredential = (await import("./handleDeleteCredential")).default;

      const user = await UserRepository.create({
        ...testUser,
      });

      const eventTypes = await addEventTypesToDb([
        {
          id: 1,
          userId: testUser.id,
        },
      ]);

      await AppRepository.seedApp("googlecalendar");

      const credential = await setupCredential({
        userId: user.id,
        type: "google_calendar",
        appId: "google-calendar",
      });

      await DestinationCalendarRepository.create({
        id: 1,
        integration: "google_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        userId: user.id,
        credentialId: credential.id,
      });

      await DestinationCalendarRepository.create({
        id: 2,
        integration: "google_calendar",
        externalId: "test@google.com",
        primaryId: "test@google.com",
        eventTypeId: eventTypes[0].id,
        credentialId: credential.id,
      });

      const userCalendar = await DestinationCalendarRepository.getByUserId(user.id);
      expect(userCalendar).toBeDefined();

      const eventTypeCalendar = await DestinationCalendarRepository.getByEventTypeId(eventTypes[0].id);
      expect(eventTypeCalendar).toBeDefined();

      await handleDeleteCredential({ userId: user.id, userMetadata: user.metadata, credentialId: 123 });

      const userCalendarAfter = await DestinationCalendarRepository.getByUserId(user.id);
      expect(userCalendarAfter).toBeNull();

      const eventTypeCalendarAfter = await DestinationCalendarRepository.getByEventTypeId(eventTypes[0].id);
      expect(eventTypeCalendarAfter).toBeNull();
    });

    // TODO: Add test for payment apps
    // TODO: Add test for event type apps
  });
});
