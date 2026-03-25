import { describe, expect, it } from "vitest";

import { TimeFormat } from "@calcom/lib/timeFormat";

import customTemplate, { evaluateConditionals } from "./customTemplate";

describe("evaluateConditionals", () => {
  it("renders the truthy branch", () => {
    const result = evaluateConditionals(
      "Before {#if ATTENDEE_FIRST_NAME}\n  Hello {ATTENDEE_FIRST_NAME}\n{else}\n  Fallback\n{/if} After",
      {
        attendeeFirstName: "Ari",
      }
    );

    expect(result).toBe("Before Hello {ATTENDEE_FIRST_NAME} After");
  });

  it("renders the falsy branch", () => {
    const result = evaluateConditionals(
      "{#if ADDITIONAL_NOTES}\n  Has notes\n{else}\n  No notes\n{/if}",
      {
        additionalNotes: "",
      }
    );

    expect(result).toBe("No notes");
  });

  it("returns empty content when else branch is missing and condition is falsy", () => {
    const result = evaluateConditionals(
      "Start {#if CANCELLATION_REASON}\n reason\n{/if} End",
      {
        cancellationReason: "",
      }
    );

    expect(result).toBe("Start  End");
  });

  it("treats unknown variables as falsy", () => {
    const result = evaluateConditionals("{#if MISSING_VALUE}Visible{else}Hidden{/if}", {});

    expect(result).toBe("Hidden");
  });

  it("is a no-op when no conditionals are present", () => {
    const original = "Hello {ATTENDEE_FIRST_NAME}";
    const result = evaluateConditionals(original, { attendeeFirstName: "Ari" });

    expect(result).toBe(original);
  });

  it("supports RESPONSES dot-notation conditionals", () => {
    const result = evaluateConditionals(
      "{#if RESPONSES.store_name.value}Visible{else}Hidden{/if}",
      {
        responses: {
          store_name: { value: "Zoya UB City" },
        } as never,
      }
    );

    expect(result).toBe("Visible");
  });
});

describe("customTemplate response tokens", () => {
  it("resolves RESPONSES dot-notation tokens", () => {
    const result = customTemplate(
      "Store: {RESPONSES.store_name.value}",
      {
        responses: {
          store_name: { value: "Zoya UB City" },
        } as never,
      },
      "en-US",
      TimeFormat.TWELVE_HOUR,
      true
    );

    expect(result.text).toBe("Store: Zoya UB City");
  });

  it("keeps normalized top-level response key behavior", () => {
    const result = customTemplate(
      "Store: {STORE_NAME}",
      {
        responses: {
          "Store Name": { value: "Zoya UB City" },
        } as never,
      },
      "en-US",
      TimeFormat.TWELVE_HOUR,
      true
    );

    expect(result.text).toBe("Store: Zoya UB City");
  });
});
