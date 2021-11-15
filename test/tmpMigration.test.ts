import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import fs from "fs";

import prisma from "../lib/prisma";
import { randomString } from "../playwright/lib/testUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const MIGRATION_SQL = fs
  .readFileSync(__dirname + "/../prisma/migrations/20211115182559_availability_issue/migration.sql")
  .toString();

async function tmpMigration() {
  await prisma.$queryRaw(MIGRATION_SQL);

  return NaN;
}
afterAll(async () => {
  await prisma.$disconnect();
});
test("tmpMigration", async () => {
  // const unknownTimezoneUser = await prisma.user.create({
  //   data: {
  //     name: "unknownTimezoneUser",
  //     email: `${randomString()}@example.com`,
  //     startTime: 0, // midnight
  //     endTime: 1380, // midnight
  //     timeZone: null,
  //   },
  // });
  const europeUser = await prisma.user.create({
    data: {
      name: "europeanUser",
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1380, // 23:00
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
  const baseDate = dayjs.utc().set("hour", 0).set("minute", 0).set("second", 0).set("millisecond", 0);

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
            "startTime": "1970-01-01T00:00:00.000Z",
          },
        ],
        "endTime": 1380,
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
            "endTime": "1970-01-01T00:00:00.000Z",
            "startTime": "1970-01-01T00:00:00.000Z",
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
            "endTime": "1970-01-01T17:00:00.000Z",
            "startTime": "1970-01-01T09:00:00.000Z",
          },
        ],
        "endTime": 1440,
        "name": "unaffectedUser",
        "startTime": 0,
      },
    ]
  `);
});
