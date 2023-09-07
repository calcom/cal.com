import { expect, it, beforeAll, vi } from "vitest";

import { getAggregateWorkingHours } from "@calcom/core/getAggregateWorkingHours";

beforeAll(() => {
  vi.setSystemTime(new Date("2021-06-20T11:59:59Z"));
});

const HAWAII_AND_NEWYORK_TEAM = [
  {
    timeZone: "America/Detroit", // GMT -4 per 22th of Aug, 2022
    workingHours: [{ userId: 1, days: [1, 2, 3, 4, 5], startTime: 780, endTime: 1260 }],
    busy: [],
    dateOverrides: [],
  },
  {
    timeZone: "Pacific/Honolulu", // GMT -10 per 22th of Aug, 2022
    workingHours: [
      { userId: 1, days: [3, 4, 5], startTime: 0, endTime: 360 },
      { userId: 2, days: [6], startTime: 0, endTime: 180 },
      { userId: 3, days: [2, 3, 4], startTime: 780, endTime: 1439 },
      { userId: 4, days: [5], startTime: 780, endTime: 1439 },
    ],
    busy: [],
    dateOverrides: [],
  },
];

/* TODO: Make this test more "professional" */
it("Sydney and Shiraz can live in harmony 🙏", async () => {
  expect(getAggregateWorkingHours(HAWAII_AND_NEWYORK_TEAM, "COLLECTIVE")).toMatchInlineSnapshot(`
    [
      {
        "days": [
          3,
          4,
          5,
        ],
        "endTime": 360,
        "startTime": 780,
      },
      {
        "days": [
          6,
        ],
        "endTime": 180,
        "startTime": 0,
        "userId": 2,
      },
      {
        "days": [
          2,
          3,
          4,
        ],
        "endTime": 1260,
        "startTime": 780,
      },
      {
        "days": [
          5,
        ],
        "endTime": 1260,
        "startTime": 780,
      },
    ]
  `);

  expect(getAggregateWorkingHours(HAWAII_AND_NEWYORK_TEAM, "ROUND_ROBIN")).toMatchInlineSnapshot(`
    [
      {
        "days": [
          1,
          2,
          3,
          4,
          5,
        ],
        "endTime": 1260,
        "startTime": 780,
        "userId": 1,
      },
      {
        "days": [
          3,
          4,
          5,
        ],
        "endTime": 360,
        "startTime": 0,
        "userId": 1,
      },
      {
        "days": [
          6,
        ],
        "endTime": 180,
        "startTime": 0,
        "userId": 2,
      },
      {
        "days": [
          2,
          3,
          4,
        ],
        "endTime": 1439,
        "startTime": 780,
        "userId": 3,
      },
      {
        "days": [
          5,
        ],
        "endTime": 1439,
        "startTime": 780,
        "userId": 4,
      },
    ]
  `);
});
