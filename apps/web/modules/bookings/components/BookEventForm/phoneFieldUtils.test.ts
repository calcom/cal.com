import { SystemField } from "@calcom/lib/bookings/SystemField";
import { describe, expect, it } from "vitest";

import { ATTENDEE_PHONE_LOCATION_VALUE, shouldHideDuplicatePhoneField } from "./phoneFieldUtils";

describe("shouldHideDuplicatePhoneField", () => {
  it("hides phone fields when location is attendee phone", () => {
    expect(
      shouldHideDuplicatePhoneField({ type: "phone", name: "custom-phone" }, ATTENDEE_PHONE_LOCATION_VALUE)
    ).toBe(true);
  });

  it("hides smsReminderNumber when location is attendee phone", () => {
    expect(
      shouldHideDuplicatePhoneField(
        { type: "phone", name: SystemField.Enum.smsReminderNumber },
        ATTENDEE_PHONE_LOCATION_VALUE
      )
    ).toBe(true);
  });

  it("does not hide the location field itself", () => {
    expect(
      shouldHideDuplicatePhoneField(
        { type: "phone", name: SystemField.Enum.location },
        ATTENDEE_PHONE_LOCATION_VALUE
      )
    ).toBe(false);
  });

  it("shows phone fields when location is not attendee phone", () => {
    expect(
      shouldHideDuplicatePhoneField({ type: "phone", name: "custom-phone" }, "zoom")
    ).toBe(false);
  });

  it("shows non-phone fields regardless of location", () => {
    expect(
      shouldHideDuplicatePhoneField({ type: "text", name: "company" }, ATTENDEE_PHONE_LOCATION_VALUE)
    ).toBe(false);
  });
});
