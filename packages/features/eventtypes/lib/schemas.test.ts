import { describe, expect, it } from "vitest";
import { createEventTypeInput, EventTypeDuplicateInput } from "./schemas";

describe("createEventTypeInput", () => {
  it("parses valid minimal input", () => {
    const input = { title: "Test", slug: "test", length: 30 };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("parses valid input with optional fields", () => {
    const input = {
      title: "Test Event",
      slug: "test-event",
      length: 60,
      description: "A test event",
      hidden: false,
      teamId: 1,
      schedulingType: "ROUND_ROBIN",
      disableGuests: true,
      slotInterval: 15,
      minimumBookingNotice: 60,
      beforeEventBuffer: 10,
      afterEventBuffer: 10,
      scheduleId: 1,
    };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("fails without title", () => {
    const input = { slug: "test", length: 30 };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails without slug", () => {
    const input = { title: "Test", length: 30 };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails without length", () => {
    const input = { title: "Test", slug: "test" };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails with negative slotInterval", () => {
    const input = { title: "Test", slug: "test", length: 30, slotInterval: -1 };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails with empty title (whitespace only)", () => {
    const input = { title: "   ", slug: "test", length: 30 };
    const result = createEventTypeInput.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("EventTypeDuplicateInput", () => {
  it("parses valid duplicate input", () => {
    const input = { id: 1, slug: "test-copy", title: "Test Copy", description: "desc", length: 30 };
    const result = EventTypeDuplicateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("fails without id", () => {
    const input = { slug: "test-copy", title: "Test Copy", description: "desc", length: 30 };
    const result = EventTypeDuplicateInput.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("parses with all required fields", () => {
    const input = { id: 1, slug: "s", title: "T", description: "desc", length: 30 };
    const result = EventTypeDuplicateInput.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("parses with empty slug", () => {
    const input = { id: 1, slug: "", title: "Test Copy", description: "desc", length: 30 };
    const result = EventTypeDuplicateInput.safeParse(input);
    expect(result.success).toBe(true);
  });
});
