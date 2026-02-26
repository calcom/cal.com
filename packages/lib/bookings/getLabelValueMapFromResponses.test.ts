import { describe, expect, it } from "vitest";
import getLabelValueMapFromResponses from "./getLabelValueMapFromResponses";

describe("getLabelValueMapFromResponses", () => {
  it("returns labelValueMap from userFieldsResponses", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: {
        field1: { label: "Name", value: "John" },
        field2: { label: "Email", value: "john@example.com" },
      },
      eventTypeId: 1,
    });

    expect(result).toEqual({ Name: "John", Email: "john@example.com" });
  });

  it("falls back to customInputs when no userFieldsResponses", () => {
    const result = getLabelValueMapFromResponses({
      customInputs: { Name: "Jane", Notes: "Test" },
      eventTypeId: 1,
    });

    expect(result).toEqual({ Name: "Jane", Notes: "Test" });
  });

  it("includes TITLE_FIELD from responses for non-dynamic events", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: {
        field1: { label: "Name", value: "John" },
      },
      responses: {
        title: { label: "Title", value: "Meeting" },
      },
      eventTypeId: 1,
    });

    expect(result).toEqual({ Name: "John", Title: "Meeting" });
  });

  it("includes SMS_REMINDER_NUMBER_FIELD from responses for non-dynamic events", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: {
        field1: { label: "Name", value: "John" },
      },
      responses: {
        smsReminderNumber: { label: "SMS", value: "+1234567890" },
      },
      eventTypeId: 1,
    });

    expect(result).toEqual({ Name: "John", SMS: "+1234567890" });
  });

  it("does not include TITLE_FIELD for dynamic events (no eventTypeId)", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: {
        field1: { label: "Name", value: "John" },
      },
      responses: {
        title: { label: "Title", value: "Meeting" },
      },
    });

    expect(result).toEqual({ Name: "John" });
    expect(result).not.toHaveProperty("Title");
  });

  it("skips entries without labels", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: {
        field1: { label: "Name", value: "John" },
        field2: { label: "", value: "hidden" },
      },
      eventTypeId: 1,
    });

    expect(result).toEqual({ Name: "John" });
  });

  it("skips hidden fields for non-organizers", () => {
    const result = getLabelValueMapFromResponses(
      {
        userFieldsResponses: {
          field1: { label: "Name", value: "John" },
          field2: { label: "Internal", value: "secret", isHidden: true },
        },
        eventTypeId: 1,
      },
      false
    );

    expect(result).toEqual({ Name: "John" });
  });

  it("includes hidden fields for organizers", () => {
    const result = getLabelValueMapFromResponses(
      {
        userFieldsResponses: {
          field1: { label: "Name", value: "John" },
          field2: { label: "Internal", value: "secret", isHidden: true },
        },
        eventTypeId: 1,
      },
      true
    );

    expect(result).toEqual({ Name: "John", Internal: "secret" });
  });

  it("returns empty object when no responses and no customInputs", () => {
    const result = getLabelValueMapFromResponses({ eventTypeId: 1 });
    expect(result).toBeUndefined();
  });

  it("handles null userFieldsResponses and null customInputs", () => {
    const result = getLabelValueMapFromResponses({
      userFieldsResponses: null,
      customInputs: null,
      eventTypeId: 1,
    });
    expect(result).toBeNull();
  });
});
