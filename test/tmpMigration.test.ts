import dayjs from "dayjs";

import prisma from "../lib/prisma";
import { tmpMigration } from "../pages/api/availability/__tmp__migration";
import { randomString } from "../playwright/lib/testUtils";

test("tmpMigration", async () => {
  const europeUser = await prisma.user.create({
    data: {
      name: "europeanUser",
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1440, // midnight
      timeZone: "Europe/London",
    },
  });

  const americanUser = await prisma.user.create({
    data: {
      name: "americanUser",
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1440, // midnight
      timeZone: "America/Los_Angeles",
    },
  });
  const baseDate = dayjs().set("hour", 0).set("minute", 0).set("second", 0).set("millisecond", 0);

  const unaffectedUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
      name: "unaffectedUser",
      startTime: 0, // midnight
      endTime: 1440, // midnight
      timeZone: "America/Los_Angeles",
      availability: {
        create: {
          startTime: baseDate.add(9, "hour").toDate(),
          endTime: baseDate.add(17, "hour").toDate(),
        },
      },
    },
  });

  await tmpMigration();

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [
          //
          europeUser.id,
          americanUser.id,
          unaffectedUser.id,
        ],
      },
    },
    select: {
      name: true,
      startTime: true,
      endTime: true,
      availability: {
        select: {
          days: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  const usersWithNormalizedDates = JSON.parse(JSON.stringify(users));
  expect(usersWithNormalizedDates).toMatchInlineSnapshot(`
    Array [
      Object {
        "availability": Array [
          Object {
            "date": null,
            "days": Array [
              0,
              1,
              2,
              3,
              4,
              5,
              6,
            ],
            "endTime": "1970-01-01T23:00:00.000Z",
            "startTime": "1970-01-01T23:00:00.000Z",
          },
        ],
        "endTime": 1440,
        "name": "europeanUser",
        "startTime": 0,
      },
      Object {
        "availability": Array [
          Object {
            "date": null,
            "days": Array [
              0,
              1,
              2,
              3,
              4,
              5,
              6,
            ],
            "endTime": "1970-01-01T23:00:00.000Z",
            "startTime": "1970-01-01T23:00:00.000Z",
          },
        ],
        "endTime": 1440,
        "name": "americanUser",
        "startTime": 0,
      },
      Object {
        "availability": Array [
          Object {
            "date": null,
            "days": Array [],
            "endTime": "1970-01-01T16:00:00.000Z",
            "startTime": "1970-01-01T08:00:00.000Z",
          },
        ],
        "endTime": 1440,
        "name": "unaffectedUser",
        "startTime": 0,
      },
    ]
  `);
});
