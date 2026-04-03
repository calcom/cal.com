import { NotificationEvent } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATIONS_ENABLED,
  NOTIFICATION_EVENT_DEFAULTS,
  type NotificationEventDefaults,
} from "../notification-defaults";

describe("NOTIFICATION_EVENT_DEFAULTS", () => {
  const allEvents = Object.values(NotificationEvent);

  it("has an entry for every NotificationEvent", () => {
    for (const event of allEvents) {
      expect(NOTIFICATION_EVENT_DEFAULTS).toHaveProperty(event);
    }
  });

  it("covers exactly the set of NotificationEvent values", () => {
    expect(Object.keys(NOTIFICATION_EVENT_DEFAULTS).sort()).toEqual([...allEvents].sort());
  });

  it("defaults all channels to enabled for every event", () => {
    const expectedDefaults: NotificationEventDefaults = {
      appPushEnabled: true,
      webPushEnabled: true,
      slackEnabled: true,
      telegramEnabled: true,
    };

    for (const event of allEvents) {
      expect(NOTIFICATION_EVENT_DEFAULTS[event]).toEqual(expectedDefaults);
    }
  });
});

describe("DEFAULT_NOTIFICATIONS_ENABLED", () => {
  it("is true", () => {
    expect(DEFAULT_NOTIFICATIONS_ENABLED).toBe(true);
  });
});
