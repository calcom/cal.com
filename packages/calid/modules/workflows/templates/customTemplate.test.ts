import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import { TimeFormat } from "@calcom/lib/timeFormat";

import { evaluateConditionals, resolveSnakeCaseToken } from "./customTemplate";

describe("resolveSnakeCaseToken", () => {
  it("resolves snake_case token to camelCase variable field", () => {
    const result = resolveSnakeCaseToken(
      "attendee_first_name",
      {
        attendeeFirstName: "Alex",
      },
      TimeFormat.TWELVE_HOUR
    );

    expect(result).toBe("Alex");
  });

  it("formats Dayjs values using the provided time format", () => {
    const eventStartTime = dayjs("2026-03-19T15:30:00Z");
    const result = resolveSnakeCaseToken(
      "event_start_time",
      {
        eventStartTime,
      },
      TimeFormat.TWENTY_FOUR_HOUR
    );

    expect(result).toBe(eventStartTime.format(TimeFormat.TWENTY_FOUR_HOUR));
  });

  it("returns an empty string for null, undefined, or missing values", () => {
    expect(
      resolveSnakeCaseToken(
        "additional_notes",
        {
          additionalNotes: null,
        },
        TimeFormat.TWELVE_HOUR
      )
    ).toBe("");
    expect(resolveSnakeCaseToken("meeting_url", {}, TimeFormat.TWELVE_HOUR)).toBe("");
  });
});

describe("evaluateConditionals", () => {
  it("renders the truthy branch", () => {
    const result = evaluateConditionals(
      "Before {#if attendee_first_name}\n  Hello {attendee_first_name}\n{else}\n  Fallback\n{/if} After",
      {
        attendeeFirstName: "Ari",
      }
    );

    expect(result).toBe("Before Hello {attendee_first_name} After");
  });

  it("renders the falsy branch", () => {
    const result = evaluateConditionals(
      "{#if additional_notes}\n  Has notes\n{else}\n  No notes\n{/if}",
      {
        additionalNotes: "",
      }
    );

    expect(result).toBe("No notes");
  });

  it("returns empty content when else branch is missing and condition is falsy", () => {
    const result = evaluateConditionals(
      "Start {#if cancellation_reason}\n reason\n{/if} End",
      {
        cancellationReason: "",
      }
    );

    expect(result).toBe("Start  End");
  });

  it("treats unknown variables as falsy", () => {
    const result = evaluateConditionals("{#if missing_value}Visible{else}Hidden{/if}", {});

    expect(result).toBe("Hidden");
  });

  it("is a no-op when no conditionals are present", () => {
    const original = "Hello {attendee_first_name}";
    const result = evaluateConditionals(original, { attendeeFirstName: "Ari" });

    expect(result).toBe(original);
  });
});
