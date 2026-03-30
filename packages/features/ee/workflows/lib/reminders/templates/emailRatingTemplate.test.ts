import { describe, it, expect, vi } from "vitest";
import emailRatingTemplate from "./emailRatingTemplate";
import { WorkflowActions } from "@calcom/prisma/enums";

const mockT = ((key: string) => key) as any;

describe("emailRatingTemplate", () => {
  it("renders non-editing mode with startTime/endTime", () => {
    const result = emailRatingTemplate({
      isEditingMode: false,
      locale: "en",
      action: WorkflowActions.EMAIL_ATTENDEE,
      t: mockT,
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T11:00:00Z",
      eventName: "Test Event",
      timeZone: "UTC",
      organizer: "John",
      name: "Jane",
      ratingUrl: "https://example.com/rate",
      noShowUrl: "https://example.com/noshow",
    });
    expect(result.emailSubject).toContain("Test Event");
    expect(result.emailBody).toContain("Jane");
  });

  it("renders editing mode correctly", () => {
    const result = emailRatingTemplate({
      isEditingMode: true,
      locale: "en",
      action: WorkflowActions.EMAIL_ATTENDEE,
      t: mockT,
    });
    expect(result.emailBody).toContain("{ATTENDEE}");
  });
});
