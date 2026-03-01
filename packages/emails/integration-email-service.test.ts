import type { CalendarEvent } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/broken-integration-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/disabled-app-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/slug-replacement-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/delegation-credential-disabled-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("@calcom/lib/formatCalendarEvent", () => ({
  formatCalEvent: vi.fn((evt: CalendarEvent) => evt),
}));

import {
  sendBrokenIntegrationEmail,
  sendDelegationCredentialDisabledEmail,
  sendDisabledAppEmail,
  sendSlugReplacementEmail,
} from "./integration-email-service";
import BrokenIntegrationEmail from "./templates/broken-integration-email";
import DelegationCredentialDisabledEmail from "./templates/delegation-credential-disabled-email";
import DisabledAppEmail from "./templates/disabled-app-email";
import SlugReplacementEmail from "./templates/slug-replacement-email";

describe("integration-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendBrokenIntegrationEmail", () => {
    it("creates BrokenIntegrationEmail with formatted event and sends it", async () => {
      const evt = {
        title: "Meeting",
        organizer: {
          email: "org@t.com",
          name: "Org",
          language: { translate: vi.fn(), locale: "en" },
          timeZone: "UTC",
        },
        attendees: [],
      } as unknown as CalendarEvent;
      await sendBrokenIntegrationEmail(evt, "calendar");
      expect(BrokenIntegrationEmail).toHaveBeenCalledWith(evt, "calendar");
      expect(BrokenIntegrationEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendDisabledAppEmail", () => {
    it("creates DisabledAppEmail and sends it", async () => {
      const mockT = vi.fn();
      await sendDisabledAppEmail({
        email: "u@t.com",
        appName: "Zoom",
        appType: ["video"],
        t: mockT,
        title: "Meeting",
        eventTypeId: 42,
      });
      expect(DisabledAppEmail).toHaveBeenCalledWith("u@t.com", "Zoom", ["video"], mockT, "Meeting", 42);
      expect(DisabledAppEmail.prototype.sendEmail).toHaveBeenCalled();
    });

    it("passes undefined for optional title and eventTypeId", async () => {
      const mockT = vi.fn();
      await sendDisabledAppEmail({
        email: "u@t.com",
        appName: "Zoom",
        appType: ["video"],
        t: mockT,
      });
      expect(DisabledAppEmail).toHaveBeenCalledWith(
        "u@t.com",
        "Zoom",
        ["video"],
        mockT,
        undefined,
        undefined
      );
      expect(DisabledAppEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendSlugReplacementEmail", () => {
    it("creates SlugReplacementEmail and sends it", async () => {
      const mockT = vi.fn();
      await sendSlugReplacementEmail({
        email: "u@t.com",
        name: "John",
        teamName: "Team A",
        t: mockT,
        slug: "old-slug",
      });
      expect(SlugReplacementEmail).toHaveBeenCalledWith("u@t.com", "John", "Team A", "old-slug", mockT);
      expect(SlugReplacementEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendDelegationCredentialDisabledEmail", () => {
    it("creates DelegationCredentialDisabledEmail and sends it", async () => {
      await sendDelegationCredentialDisabledEmail({
        recipientEmail: "u@t.com",
        recipientName: "John",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      expect(DelegationCredentialDisabledEmail).toHaveBeenCalledWith({
        recipientEmail: "u@t.com",
        recipientName: "John",
        calendarAppName: "Google Calendar",
        conferencingAppName: "Google Meet",
      });
      expect(DelegationCredentialDisabledEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });
});
