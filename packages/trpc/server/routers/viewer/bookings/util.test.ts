import { describe, expect, it } from "vitest";
import { bookingInclude } from "./util";

describe("bookingInclude", () => {
  it("does not fetch the booking owner's credentials", () => {
    // `credentials: true` pulls every Credential column, including `key`, which holds
    // OAuth tokens and API secrets. No consumer of this procedure reads them.
    expect(bookingInclude.user.include).not.toHaveProperty("credentials");
  });

  it("still fetches the fields editLocation depends on", () => {
    expect(bookingInclude.user.include).toHaveProperty("destinationCalendar");
    expect(bookingInclude.user.include.profiles.select).toHaveProperty("organizationId");
    expect(bookingInclude).toHaveProperty("references");
    expect(bookingInclude).toHaveProperty("attendees");
  });
});
