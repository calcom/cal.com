import { shouldSkipAttendeeRecordingEmails } from "@calcom/web/lib/daily-webhook/should-skip-attendee-recording-emails";
import { describe, expect, test } from "vitest";

/**
 * Tests for the org-level disableAttendeeCalVideoRecordingEmail setting logic.
 *
 * The recorded-daily-video route determines whether to skip attendee recording emails
 * by checking the organization settings through the booking's event type team hierarchy
 * and for personal bookings in an organization, through the organizer's org profile:
 *
 * 1. If the event type's team is a sub-team (has parentId),
 *    check team.parent.organizationSettings.disableAttendeeCalVideoRecordingEmail
 * 2. If there is no team, resolve the organizer org from booking.user and check its organization settings
 * 3. If there are no applicable org settings, attendee recording emails are sent (not disabled)
 *
 * Note: When the setting is enabled, only attendee recording emails are skipped.
 * The organizer still receives the recording email.
 */

type OrgSettings = {
  disableAttendeeCalVideoRecordingEmail: boolean;
} | null;

type TeamData = {
  parentId: number | null;
  parent: {
    organizationSettings: OrgSettings;
  } | null;
} | null;

type EventTypeData = {
  team: TeamData;
};

describe("Org-level disableAttendeeCalVideoRecordingEmail setting", () => {
  describe("when event type belongs to a sub-team within an organization", () => {
    test("should disable recording emails when parent org setting is true", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: 1,
          parent: {
            organizationSettings: {
              disableAttendeeCalVideoRecordingEmail: true,
            },
          },
        },
      };
      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(true);
    });

    test("should not disable recording emails when parent org setting is false", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: 1,
          parent: {
            organizationSettings: {
              disableAttendeeCalVideoRecordingEmail: false,
            },
          },
        },
      };
      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(false);
    });

    test("should not disable recording emails when parent org has no settings", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: 1,
          parent: {
            organizationSettings: null,
          },
        },
      };
      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(false);
    });

    test("should not disable recording emails when parent is null", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: 1,
          parent: null,
        },
      };
      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(false);
    });
  });

  describe("when event type has no team (personal event type)", () => {
    test("should disable recording emails when organizer org setting is true", () => {
      const eventType: EventTypeData = {
        team: null,
      };

      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: {
            disableAttendeeCalVideoRecordingEmail: true,
          },
        })
      ).toBe(true);
    });

    test("should not disable recording emails when organizer org setting is false", () => {
      const eventType: EventTypeData = {
        team: null,
      };

      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: {
            disableAttendeeCalVideoRecordingEmail: false,
          },
        })
      ).toBe(false);
    });

    test("should not disable recording emails when team and organizer org are null", () => {
      const eventType: EventTypeData = {
        team: null,
      };

      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(false);
    });
  });

  describe("when event type belongs to a standalone team (not an org)", () => {
    test("should not disable recording emails for non-org team without parent", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: null,
          parent: null,
        },
      };
      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: {
            disableAttendeeCalVideoRecordingEmail: true,
          },
        })
      ).toBe(false);
    });

    test("should not disable recording emails when no team org settings exist even if organizer has no org", () => {
      const eventType: EventTypeData = {
        team: {
          parentId: null,
          parent: null,
        },
      };

      expect(
        shouldSkipAttendeeRecordingEmails({
          eventType,
          organizerOrganizationSettings: null,
        })
      ).toBe(false);
    });
  });
});
