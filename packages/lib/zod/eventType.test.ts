import { describe, expect, it } from "vitest";
import { eventTypeLocations, eventTypeSlug } from "./eventType";

describe("eventTypeLocations", () => {
  it("parses a valid array of locations", () => {
    const input = [
      { type: "inPerson", address: "123 Main St" },
      { type: "link", link: "https://meet.google.com/abc" },
    ];
    const result = eventTypeLocations.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("parses a location with all optional fields", () => {
    const input = [
      {
        type: "inPerson",
        address: "123 Main St",
        link: "https://example.com",
        displayLocationPublicly: true,
        hostPhoneNumber: "+1234567890",
        credentialId: 1,
        teamName: "My Team",
        customLabel: "Office",
      },
    ];
    const result = eventTypeLocations.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("parses a minimal location with only type", () => {
    const input = [{ type: "phone" }];
    const result = eventTypeLocations.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a location without type", () => {
    const input = [{ address: "123 Main St" }];
    const result = eventTypeLocations.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid link URL", () => {
    const input = [{ type: "link", link: "not-a-url" }];
    const result = eventTypeLocations.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("parses an empty array", () => {
    const result = eventTypeLocations.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("rejects a non-array input", () => {
    const result = eventTypeLocations.safeParse("not an array");
    expect(result.success).toBe(false);
  });
});

describe("eventTypeSlug", () => {
  it("transforms and validates a simple slug", () => {
    const result = eventTypeSlug.safeParse("my-event");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("my-event");
    }
  });

  it("slugifies a string with spaces", () => {
    const result = eventTypeSlug.safeParse("My Event Type");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("my-event-type");
    }
  });

  it("trims whitespace before slugifying", () => {
    const result = eventTypeSlug.safeParse("  my-event  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("my-event");
    }
  });

  it("rejects an empty string", () => {
    const result = eventTypeSlug.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only string", () => {
    const result = eventTypeSlug.safeParse("   ");
    expect(result.success).toBe(false);
  });
});
