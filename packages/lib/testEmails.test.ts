import { beforeEach, describe, expect, it } from "vitest";
import { getTestEmails, resetTestEmails, setTestEmail } from "./testEmails";

describe("testEmails", () => {
  beforeEach(() => {
    resetTestEmails();
  });

  it("returns undefined before any emails are set", () => {
    globalThis.testEmails = undefined as unknown as typeof globalThis.testEmails;
    expect(getTestEmails()).toBeUndefined();
  });

  it("initializes the array on first setTestEmail call", () => {
    globalThis.testEmails = undefined as unknown as typeof globalThis.testEmails;
    setTestEmail({
      to: "user@example.com",
      from: "noreply@cal.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(getTestEmails()).toHaveLength(1);
  });

  it("pushes emails to the global array", () => {
    setTestEmail({
      to: "a@example.com",
      from: "noreply@cal.com",
      subject: "First",
      html: "<p>1</p>",
    });
    setTestEmail({
      to: "b@example.com",
      from: { email: "noreply@cal.com", name: "Cal" },
      subject: "Second",
      html: "<p>2</p>",
    });
    expect(getTestEmails()).toHaveLength(2);
    expect(getTestEmails()[0].to).toBe("a@example.com");
    expect(getTestEmails()[1].to).toBe("b@example.com");
  });

  it("supports from as object with email and name", () => {
    setTestEmail({
      to: "user@example.com",
      from: { email: "sender@cal.com", name: "Cal.com" },
      subject: "Test",
      html: "<p>Hello</p>",
    });
    const email = getTestEmails()[0];
    expect(email.from).toEqual({ email: "sender@cal.com", name: "Cal.com" });
  });

  it("supports icalEvent attachment", () => {
    setTestEmail({
      to: "user@example.com",
      from: "noreply@cal.com",
      subject: "Booking",
      html: "<p>Confirmed</p>",
      icalEvent: { filename: "event.ics", content: "BEGIN:VCALENDAR" },
    });
    expect(getTestEmails()[0].icalEvent).toEqual({
      filename: "event.ics",
      content: "BEGIN:VCALENDAR",
    });
  });

  it("resetTestEmails clears all emails", () => {
    setTestEmail({
      to: "user@example.com",
      from: "noreply@cal.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });
    expect(getTestEmails()).toHaveLength(1);
    resetTestEmails();
    expect(getTestEmails()).toHaveLength(0);
  });
});
