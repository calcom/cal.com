import type { ScheduleOutput } from "@calcom/platform-types";
import type { User } from "@calcom/prisma/client";

import { transformApiScheduleForAtom } from "./transformApiScheduleForAtom";

const SCHEDULE_OWNER_ID = 256;

describe("transformScheduleForAtom", () => {
  const user: Pick<User, "id" | "defaultScheduleId" | "timeZone"> = {
    id: SCHEDULE_OWNER_ID,
    defaultScheduleId: 139,
    timeZone: "America/New_York",
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should return null if user is not provided", () => {
    const schedule: ScheduleOutput | null = {
      id: 139,
      ownerId: SCHEDULE_OWNER_ID,
      name: "Default",
      timeZone: "America/Cancun",
      availability: [
        {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
      isDefault: true,
      overrides: [],
    };

    expect(transformApiScheduleForAtom(undefined, schedule, 1)).toBeNull();
  });

  it("should return null if schedule is not provided", () => {
    expect(transformApiScheduleForAtom(user, null, 1)).toBeNull();
  });

  it("should transform schedule correctly", () => {
    const schedule: ScheduleOutput = {
      id: 139,
      ownerId: SCHEDULE_OWNER_ID,
      name: "Default",
      timeZone: "America/Cancun",
      availability: [
        {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
      isDefault: true,
      overrides: [],
    };

    const expectedResult = {
      id: 139,
      name: "Default",
      isManaged: false,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 540,
          endTime: 1020,
          userId: 256,
        },
      ],
      schedule: [
        {
          userId: 256,
          scheduleId: 139,
          days: [1, 2, 3, 4, 5],
          startTime: new Date(Date.UTC(1970, 0, 1, 9, 0)),
          endTime: new Date(Date.UTC(1970, 0, 1, 17, 0)),
          date: null,
        },
      ],
      availability: [
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
            start: new Date("2024-05-14T09:00:00.000Z"),
            end: new Date("2024-05-14T17:00:00.000Z"),
          },
        ],
        [],
      ],
      timeZone: "America/Cancun",
      dateOverrides: [],
      isDefault: true,
      isLastSchedule: true,
      readOnly: false,
    };

    const result = transformApiScheduleForAtom(user, schedule, 1);

    expect(result).toEqual(expectedResult);
  });
});
