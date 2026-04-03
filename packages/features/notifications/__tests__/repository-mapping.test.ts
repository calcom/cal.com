import { NotificationEvent } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { buildChannelKey } from "../notification-preference-keys";

/**
 * These tests validate the mapping logic extracted from the repository.
 * They ensure that partial key sets are treated as "no row" (inherit from parent),
 * preserving the full-row replacement contract.
 */

type GenericPrefRow = { key: string; booleanValue: boolean };
type NotificationPreferencesRow = {
  event: NotificationEvent;
  appPushEnabled: boolean;
  webPushEnabled: boolean;
  slackEnabled: boolean;
  telegramEnabled: boolean;
};

function mapToPreferences(
  rows: GenericPrefRow[],
  event: NotificationEvent
): NotificationPreferencesRow | null {
  const channelMap = new Map<string, boolean>();
  for (const row of rows) {
    channelMap.set(row.key, row.booleanValue);
  }

  const appPushKey = buildChannelKey(event, "app_push");
  const webPushKey = buildChannelKey(event, "web_push");
  const slackKey = buildChannelKey(event, "slack");
  const telegramKey = buildChannelKey(event, "telegram");

  const hasAll =
    channelMap.has(appPushKey) &&
    channelMap.has(webPushKey) &&
    channelMap.has(slackKey) &&
    channelMap.has(telegramKey);

  if (!hasAll) return null;

  return {
    event,
    appPushEnabled: channelMap.get(appPushKey)!,
    webPushEnabled: channelMap.get(webPushKey)!,
    slackEnabled: channelMap.get(slackKey)!,
    telegramEnabled: channelMap.get(telegramKey)!,
  };
}

const EVENT = NotificationEvent.BOOKING_CONFIRMED;

describe("repository mapToPreferences", () => {
  it("should return null when no keys are present", () => {
    expect(mapToPreferences([], EVENT)).toBeNull();
  });

  it("should return null when only some channel keys are present (partial keys)", () => {
    const partial: GenericPrefRow[] = [
      { key: buildChannelKey(EVENT, "web_push"), booleanValue: false },
      { key: buildChannelKey(EVENT, "slack"), booleanValue: true },
    ];
    expect(mapToPreferences(partial, EVENT)).toBeNull();
  });

  it("should return null when 3 of 4 keys are present", () => {
    const almostAll: GenericPrefRow[] = [
      { key: buildChannelKey(EVENT, "app_push"), booleanValue: true },
      { key: buildChannelKey(EVENT, "web_push"), booleanValue: false },
      { key: buildChannelKey(EVENT, "slack"), booleanValue: true },
    ];
    expect(mapToPreferences(almostAll, EVENT)).toBeNull();
  });

  it("should return full row when all 4 channel keys are present", () => {
    const allKeys: GenericPrefRow[] = [
      { key: buildChannelKey(EVENT, "app_push"), booleanValue: false },
      { key: buildChannelKey(EVENT, "web_push"), booleanValue: true },
      { key: buildChannelKey(EVENT, "slack"), booleanValue: false },
      { key: buildChannelKey(EVENT, "telegram"), booleanValue: true },
    ];

    expect(mapToPreferences(allKeys, EVENT)).toEqual({
      event: EVENT,
      appPushEnabled: false,
      webPushEnabled: true,
      slackEnabled: false,
      telegramEnabled: true,
    });
  });

  it("should ignore unrelated keys and still require all 4 channel keys", () => {
    const mixedKeys: GenericPrefRow[] = [
      { key: "notifications.enabled", booleanValue: true },
      { key: buildChannelKey(EVENT, "app_push"), booleanValue: true },
      { key: buildChannelKey(EVENT, "web_push"), booleanValue: true },
      { key: buildChannelKey(EVENT, "slack"), booleanValue: true },
      { key: buildChannelKey(EVENT, "telegram"), booleanValue: false },
    ];

    expect(mapToPreferences(mixedKeys, EVENT)).toEqual({
      event: EVENT,
      appPushEnabled: true,
      webPushEnabled: true,
      slackEnabled: true,
      telegramEnabled: false,
    });
  });
});
