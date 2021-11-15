import dayjs from "dayjs";

import prisma from "../lib/prisma";
import { tmpMigration } from "../pages/api/availability/__tmp__migration";
import { randomString } from "../playwright/lib/testUtils";

test("tmpMigration", async () => {
  const europeUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1440, // midnight
      timeZone: "Europe/London",
    },
  });

  const americanUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1440, // midnight
      timeZone: "America/Los_Angeles",
    },
  });
  const baseDate = dayjs()
    .tz("Europe/London")
    .set("hour", 0)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  const unaffectedUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
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

  expect(users).toMatchInlineSnapshot(`
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
            "endTime": 1970-01-01T01:00:00.000Z,
            "startTime": 1970-01-01T01:00:00.000Z,
          },
        ],
        "endTime": 1440,
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
            "endTime": 1970-01-01T08:00:00.000Z,
            "startTime": 1970-01-01T08:00:00.000Z,
          },
        ],
        "endTime": 1440,
        "startTime": 0,
      },
      Object {
        "availability": Array [
          Object {
            "date": null,
            "days": Array [],
            "endTime": 1970-01-01T18:00:00.000Z,
            "startTime": 1970-01-01T10:00:00.000Z,
          },
        ],
        "endTime": 1440,
        "startTime": 0,
      },
    ]
  `);
});
