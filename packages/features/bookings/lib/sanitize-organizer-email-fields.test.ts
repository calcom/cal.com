import { describe, expect, it } from "vitest";

import { sanitizeOrganizerEmailFields } from "./sanitize-organizer-email-fields";

describe("sanitizeOrganizerEmailFields", () => {
  const organizerEmail = "organizer@example.com";
  const primaryEmail = "primary@example.com";

  it("should nullify cancelledBy when it matches organizer email", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: organizerEmail,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
    expect(result.rescheduledBy).toBeNull();
  });

  it("should nullify rescheduledBy when it matches organizer email", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: null,
      rescheduledBy: organizerEmail,
    });

    expect(result.cancelledBy).toBeNull();
    expect(result.rescheduledBy).toBeNull();
  });

  it("should nullify cancelledBy when it matches primary email", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: primaryEmail,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
  });

  it("should nullify both fields when both match organizer emails", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: primaryEmail,
      rescheduledBy: organizerEmail,
    });

    expect(result.cancelledBy).toBeNull();
    expect(result.rescheduledBy).toBeNull();
  });

  it("should preserve cancelledBy when it does not match any organizer email", () => {
    const attendeeEmail = "attendee@example.com";
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: attendeeEmail,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBe(attendeeEmail);
  });

  it("should preserve rescheduledBy when it does not match any organizer email", () => {
    const attendeeEmail = "attendee@example.com";
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: null,
      rescheduledBy: attendeeEmail,
    });

    expect(result.rescheduledBy).toBe(attendeeEmail);
  });

  it("should handle null organizer emails in the array", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [null, organizerEmail],
      cancelledBy: organizerEmail,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
  });

  it("should handle undefined organizer emails in the array", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [undefined, organizerEmail],
      cancelledBy: organizerEmail,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
  });

  it("should preserve fields when both are null", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [primaryEmail, organizerEmail],
      cancelledBy: null,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
    expect(result.rescheduledBy).toBeNull();
  });

  it("should not match null against null organizer emails", () => {
    const result = sanitizeOrganizerEmailFields({
      organizerEmails: [null, null],
      cancelledBy: null,
      rescheduledBy: null,
    });

    expect(result.cancelledBy).toBeNull();
    expect(result.rescheduledBy).toBeNull();
  });
});
