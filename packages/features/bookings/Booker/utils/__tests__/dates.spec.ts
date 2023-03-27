import MockDate from "mockdate";

import { TimeFormat } from "@calcom/lib/timeFormat";

import { formatEventFromToTime } from "../dates";

describe("Booker: formatEventFromToTime", () => {
  beforeAll(() => {
    MockDate.set("2023-03-23");
  });
  it("Should show the correct date format based on locale", () => {
    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        30,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30am – 12:00pm");

    // Day is translated by dayjs settings instead of this utility. This utility only ensure the format is correct.
    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        30,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "nl-NL"
      )
    ).toEqual("Thursday, 23 maart 2023 11:30am – 12:00pm");
  });

  it("Should show correct end time for a meeting based on duration", () => {
    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        30,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30am – 12:00pm");

    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        120,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30am – 1:30pm");

    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        1,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30am – 11:31am");
  });

  it("Should show correct time format", () => {
    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        30,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30am – 12:00pm");

    expect(
      formatEventFromToTime(
        "2023-03-23T18:17:00.000Z",
        30,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 7:17pm – 7:47pm");

    expect(
      formatEventFromToTime(
        "2023-03-23T10:30:00.000Z",
        30,
        TimeFormat.TWENTY_FOUR_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 11:30 – 12:00");

    expect(
      formatEventFromToTime(
        "2023-03-23T18:17:00.000Z",
        30,
        TimeFormat.TWENTY_FOUR_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 19:17 – 19:47");
  });

  it("Should show correct time if duration flows over into next day", () => {
    expect(
      formatEventFromToTime(
        "2023-03-23T21:30:00.000Z",
        300,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 10:30pm – 3:30am");

    expect(
      formatEventFromToTime(
        "2023-03-23T21:30:00.000Z",
        300,
        TimeFormat.TWENTY_FOUR_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 22:30 – 03:30");
  });

  it("Should format the time according to the correct timezone", () => {
    expect(
      formatEventFromToTime(
        "2023-03-23T12:30:00.000Z",
        60,
        TimeFormat.TWELVE_HOUR,
        "Europe/Amsterdam",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 1:30pm – 2:30pm");

    expect(
      formatEventFromToTime(
        "2023-03-23T12:30:00.000Z",
        60,
        TimeFormat.TWELVE_HOUR,
        "America/New_York",
        "en-US"
      )
    ).toEqual("Thursday, March 23, 2023 8:30am – 9:30am");

    expect(
      formatEventFromToTime("2023-03-23T12:30:00.000Z", 60, TimeFormat.TWELVE_HOUR, "Asia/Hong_Kong", "en-US")
    ).toEqual("Thursday, March 23, 2023 8:30pm – 9:30pm");
  });
});
