import { describe, expect, it } from "vitest";
import type { BookingRedirectForm } from "./types";

describe("BookingRedirectForm type", () => {
  it("should accept a valid BookingRedirectForm object", () => {
    const form: BookingRedirectForm = {
      dateRange: { startDate: new Date(), endDate: new Date() },
      startDateOffset: 0,
      endDateOffset: 0,
      toTeamUserId: null,
      reasonId: 1,
      forUserId: null,
    };
    expect(form.dateRange.startDate).toBeInstanceOf(Date);
    expect(form.reasonId).toBe(1);
    expect(form.toTeamUserId).toBeNull();
  });

  it("should accept optional fields", () => {
    const form: BookingRedirectForm = {
      dateRange: { startDate: new Date(), endDate: new Date() },
      startDateOffset: 0,
      endDateOffset: 0,
      toTeamUserId: 42,
      reasonId: 2,
      notes: "On vacation",
      showNotePublicly: true,
      uuid: "abc-123",
      forUserId: 10,
      forUserName: "John",
      forUserAvatar: "https://example.com/avatar.png",
      toUserName: "Jane",
    };
    expect(form.notes).toBe("On vacation");
    expect(form.showNotePublicly).toBe(true);
    expect(form.uuid).toBe("abc-123");
    expect(form.toTeamUserId).toBe(42);
  });
});
