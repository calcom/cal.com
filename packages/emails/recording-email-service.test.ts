import type { CalendarEvent } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/organizer-daily-video-download-recording-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/attendee-daily-video-download-recording-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/organizer-daily-video-download-transcript-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/attendee-daily-video-download-transcript-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("@calcom/lib/formatCalendarEvent", () => ({
  formatCalEvent: vi.fn((evt: CalendarEvent) => evt),
}));

import { sendDailyVideoRecordingEmails, sendDailyVideoTranscriptEmails } from "./recording-email-service";
import AttendeeDailyVideoDownloadRecordingEmail from "./templates/attendee-daily-video-download-recording-email";
import AttendeeDailyVideoDownloadTranscriptEmail from "./templates/attendee-daily-video-download-transcript-email";
import OrganizerDailyVideoDownloadRecordingEmail from "./templates/organizer-daily-video-download-recording-email";
import OrganizerDailyVideoDownloadTranscriptEmail from "./templates/organizer-daily-video-download-transcript-email";

const createCalEvent = (attendeeCount = 1): CalendarEvent =>
  ({
    title: "Meeting",
    organizer: {
      email: "org@t.com",
      name: "Org",
      language: { translate: vi.fn(), locale: "en" },
      timeZone: "UTC",
    },
    attendees: Array.from({ length: attendeeCount }, (_, i) => ({
      email: `a${i}@t.com`,
      name: `A${i}`,
      language: { translate: vi.fn(), locale: "en" },
      timeZone: "UTC",
    })),
  }) as unknown as CalendarEvent;

describe("recording-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendDailyVideoRecordingEmails", () => {
    it("sends organizer recording email", async () => {
      const evt = createCalEvent(1);
      await sendDailyVideoRecordingEmails(evt, "https://download.link/rec");
      expect(OrganizerDailyVideoDownloadRecordingEmail).toHaveBeenCalledWith(
        evt,
        "https://download.link/rec"
      );
    });

    it("sends attendee recording emails for each attendee", async () => {
      const evt = createCalEvent(2);
      await sendDailyVideoRecordingEmails(evt, "https://download.link/rec");
      expect(AttendeeDailyVideoDownloadRecordingEmail).toHaveBeenCalledTimes(2);
    });

    it("sends organizer + attendees emails", async () => {
      const evt = createCalEvent(3);
      await sendDailyVideoRecordingEmails(evt, "https://download.link/rec");
      expect(OrganizerDailyVideoDownloadRecordingEmail).toHaveBeenCalledTimes(1);
      expect(AttendeeDailyVideoDownloadRecordingEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe("sendDailyVideoTranscriptEmails", () => {
    it("sends organizer transcript email", async () => {
      const evt = createCalEvent(1);
      const transcripts = ["https://transcript.link/1"];
      await sendDailyVideoTranscriptEmails(evt, transcripts);
      expect(OrganizerDailyVideoDownloadTranscriptEmail).toHaveBeenCalledWith(evt, transcripts);
    });

    it("sends attendee transcript emails for each attendee", async () => {
      const evt = createCalEvent(2);
      const transcripts = ["https://transcript.link/1"];
      await sendDailyVideoTranscriptEmails(evt, transcripts);
      expect(AttendeeDailyVideoDownloadTranscriptEmail).toHaveBeenCalledTimes(2);
    });

    it("sends organizer + attendees emails", async () => {
      const evt = createCalEvent(3);
      const transcripts = ["https://transcript.link/1"];
      await sendDailyVideoTranscriptEmails(evt, transcripts);
      expect(OrganizerDailyVideoDownloadTranscriptEmail).toHaveBeenCalledTimes(1);
      expect(AttendeeDailyVideoDownloadTranscriptEmail).toHaveBeenCalledTimes(3);
    });
  });
});
