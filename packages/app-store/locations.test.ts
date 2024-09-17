import type { TFunction } from "next-i18next";
import { describe, it, expect, vi } from "vitest";

import type { EventLocationType } from "@calcom/app-store/locations";
import { getSuccessPageLocationMessage, getHumanReadableLocationValue } from "@calcom/app-store/locations";
import { BookingStatus } from "@calcom/prisma/enums";

describe("getSuccessPageLocationMessage", () => {
  const tFunc = vi.fn((key: string) => key) as unknown as TFunction;

  it("should return the original location for non-conferencing types", () => {
    const location = "Physical Address" as EventLocationType["type"];

    const result = getSuccessPageLocationMessage(location, tFunc, BookingStatus.ACCEPTED);

    expect(result).toBe(location);
  });

  it("should return web conference for cancelled bookings", () => {
    const location = "https://8x8.vc/company" as EventLocationType["type"];

    const result = getSuccessPageLocationMessage(location, tFunc, BookingStatus.CANCELLED);

    expect(result).toBe("web_conference");
  });

  it("should return web conference for rejected bookings", () => {
    const location = "integrations:daily" as EventLocationType["type"];

    const result = getSuccessPageLocationMessage(location, tFunc, BookingStatus.REJECTED);

    expect(result).toBe("web_conference");
  });

  it("should return location with confirmation email message for accepted bookings", () => {
    const location = "integrations:daily" as EventLocationType["type"];

    const result = getSuccessPageLocationMessage(location, tFunc, BookingStatus.ACCEPTED);

    const expectedLocation = getHumanReadableLocationValue(location, tFunc);
    expect(result).toBe(`${expectedLocation}: meeting_url_in_confirmation_email`);
  });

  it("should return web conferencing details to follow for other booking statuses", () => {
    const location = "https://8x8.vc/company" as EventLocationType["type"];

    const result = getSuccessPageLocationMessage(location, tFunc, BookingStatus.PENDING);

    expect(result).toBe("web_conferencing_details_to_follow");
  });
});
