import { availabilityAsString } from "@calcom/lib/availability";
import { expect, it } from "vitest";

it("correctly handles 1 day", async () => {
  const availability = {
    id: 1,
    userId: 2,
    eventTypeId: 3,
    days: [1],
    startTime: new Date(Date.UTC(1970, 1, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 1, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  };

  const result = availabilityAsString(availability, {
    locale: "en",
    hour12: true,
  });

  expect(replaceUnicodeSpace(result)).toBe("Mon, 9:00 AM - 5:00 PM");
});

it("correctly handles all days", async () => {
  const availability = {
    id: 1,
    userId: 2,
    eventTypeId: 3,
    days: [1, 2, 3, 4, 5, 6, 7],
    startTime: new Date(Date.UTC(1970, 1, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 1, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  };

  const result = availabilityAsString(availability, {
    locale: "en",
    hour12: true,
  });

  expect(replaceUnicodeSpace(result)).toBe("Mon - Sun, 9:00 AM - 5:00 PM");
});

it("correctly handles staggered days", async () => {
  const availability = {
    id: 1,
    userId: 2,
    eventTypeId: 3,
    days: [1, 3, 5, 7],
    startTime: new Date(Date.UTC(1970, 1, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 1, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  };

  const result = availabilityAsString(availability, {
    locale: "en",
    hour12: true,
  });

  expect(replaceUnicodeSpace(result)).toBe("Mon, Wed, Fri, Sun, 9:00 AM - 5:00 PM");
});

it("correctly produces days and times - 12 hours", async () => {
  const availability = {
    id: 1,
    userId: 2,
    eventTypeId: 3,
    days: [1, 2, 3],
    startTime: new Date(Date.UTC(1970, 1, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 1, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  };

  const result = availabilityAsString(availability, {
    locale: "en",
    hour12: true,
  });

  expect(replaceUnicodeSpace(result)).toBe("Mon - Wed, 9:00 AM - 5:00 PM");
});

it("correctly produces days and times - 24 hours", async () => {
  const availability = {
    id: 1,
    userId: 2,
    eventTypeId: 3,
    days: [1, 2, 3],
    startTime: new Date(Date.UTC(1970, 1, 1, 9, 0, 0, 0)),
    endTime: new Date(Date.UTC(1970, 1, 1, 17, 0, 0, 0)),
    date: null,
    scheduleId: 1,
    profileId: null,
  };

  const result = availabilityAsString(availability, {
    locale: "en",
    hour12: false,
  });

  expect(replaceUnicodeSpace(result)).toBe("Mon - Wed, 09:00 - 17:00");
});

// INFO: This is because on GitHub, the international date formatting
// produces Unicode characters. Instead of using line for line code from the
// availability.ts file, opted for this instead.
const replaceUnicodeSpace = (string: string) => {
  return string.replace(/\u202f/g, " ");
};
