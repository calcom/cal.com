import MockDate from "mockdate";

import { TimeFormat } from "@calcom/lib/timeFormat";

import { formatEventFromToTime } from "../dates";

describe("Booker: formatEventFromToTime", () => {
  beforeAll(() => {
    MockDate.set("2023-03-23");
  });
  it("Should show the correct date format based on locale", () => {
    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 30, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 8:30am – 9:00am"
    );

    // Day is translated by dayjs settings instead of this utility. This utility only ensure the format is correct.
    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 30, TimeFormat.TWELVE_HOUR, "nl-NL")).toEqual(
      "Thursday, 23 maart 2023 8:30am – 9:00am"
    );
  });

  it("Should show correct end time for a meeting based on duration", () => {
    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 30, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 8:30am – 9:00am"
    );

    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 120, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 8:30am – 10:30am"
    );

    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 1, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 8:30am – 8:31am"
    );
  });

  it("Should show correct time format", () => {
    expect(formatEventFromToTime("2023-03-23T10:30:00.000Z", 30, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 8:30am – 9:00am"
    );

    expect(formatEventFromToTime("2023-03-23T18:17:00.000Z", 30, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 4:17pm – 4:47pm"
    );

    expect(
      formatEventFromToTime("2023-03-23T10:30:00.000Z", 30, TimeFormat.TWENTY_FOUR_HOUR, "en-US")
    ).toEqual("Thursday, March 23, 2023 08:30 – 09:00");

    expect(
      formatEventFromToTime("2023-03-23T18:17:00.000Z", 30, TimeFormat.TWENTY_FOUR_HOUR, "en-US")
    ).toEqual("Thursday, March 23, 2023 16:17 – 16:47");
  });

  it("Should show correct time if duration flows over into next day", () => {
    expect(formatEventFromToTime("2023-03-23T23:30:00.000Z", 300, TimeFormat.TWELVE_HOUR, "en-US")).toEqual(
      "Thursday, March 23, 2023 9:30pm – 2:30am"
    );

    expect(
      formatEventFromToTime("2023-03-23T23:30:00.000Z", 300, TimeFormat.TWENTY_FOUR_HOUR, "en-US")
    ).toEqual("Thursday, March 23, 2023 21:30 – 02:30");
  });
});
