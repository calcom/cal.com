import { describe, expect, it } from "vitest";

import { GoogleCalendarProviderAdapter } from "../google/googleAdapter";
import { OutlookCalendarProviderAdapter } from "../outlook/outlookAdapter";
import { CalendarProviderRegistry } from "../registry";
import { CalendarProvider } from "../types";

describe("CalendarProviderRegistry", () => {
  it("returns Google adapter for GOOGLE provider", () => {
    const registry = new CalendarProviderRegistry();

    const adapter = registry.getAdapter(CalendarProvider.GOOGLE);

    expect(adapter).toBeInstanceOf(GoogleCalendarProviderAdapter);
  });

  it("returns Outlook adapter for OUTLOOK provider", () => {
    const registry = new CalendarProviderRegistry();

    const adapter = registry.getAdapter(CalendarProvider.OUTLOOK);

    expect(adapter).toBeInstanceOf(OutlookCalendarProviderAdapter);
  });
});
