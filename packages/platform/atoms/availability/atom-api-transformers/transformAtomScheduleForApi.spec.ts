import type { UpdateScheduleInput_2024_06_11 } from "@calcom/platform-types";

import type { AvailabilityFormValues } from "../types";
import { transformAtomScheduleForApi } from "./transformAtomScheduleForApi";

describe("transformAtomScheduleForApi", () => {
  it("should transform atom schedule correctly to API format", () => {
    const input: AvailabilityFormValues = {
      name: "Default",
      schedule: [
        [],
        [
          {
            start: new Date("2024-05-14T09:00:00.000Z"),
            end: new Date("2024-05-14T17:00:00.000Z"),
          },
        ],
        [
          {
            start: new Date("2024-05-14T09:00:00.000Z"),
            end: new Date("2024-05-14T17:00:00.000Z"),
          },
        ],
        [
          {
            start: new Date("2024-05-14T09:00:00.000Z"),
            end: new Date("2024-05-14T17:00:00.000Z"),
          },
        ],
        [
          {
            start: new Date("2024-05-14T09:00:00.000Z"),
            end: new Date("2024-05-14T17:00:00.000Z"),
          },
        ],
        [
          {
            start: new Date("2024-05-14T11:00:00.000Z"),
            end: new Date("2024-05-14T12:00:00.000Z"),
          },
        ],
        [],
      ],
      dateOverrides: [],
      timeZone: "America/Cancun",
      isDefault: true,
    };

    const expectedOutput: UpdateScheduleInput_2024_06_11 = {
      name: "Default",
      timeZone: "America/Cancun",
      isDefault: true,
      availability: [
        {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
          startTime: "09:00",
          endTime: "17:00",
        },
        {
          days: ["Friday"],
          startTime: "11:00",
          endTime: "12:00",
        },
      ],
      overrides: [],
    };

    const result = transformAtomScheduleForApi(input);

    expect(result).toEqual(expectedOutput);
  });
});
