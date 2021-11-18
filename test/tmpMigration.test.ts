import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import fs from "fs";

import prisma from "../lib/prisma";
import { randomString } from "../playwright/lib/testUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

async function tmpMigration() {
  //   console.log(
  //     await prisma.$queryRaw(`
  //   select
  //   id as "userId",
  //   CAST(CONCAT(CAST(("startTime") AS text), ' minute')::interval AS time) as "startTime",
  //   CAST(CONCAT(CAST(("endTime") AS text), ' minute')::interval AS time)  as "endTime",
  //   ARRAY [0,1,2,3,4,5,6]
  // from
  //   (
  //     select
  //       users.id,
  //       users."startTime",
  //       users."endTime",
  //       users."timeZone",
  //       count("Availability".id) as availability_count
  //     from users
  //     left join "Availability" on "Availability"."userId" = users.id
  //     group by users.id
  //   ) usersWithAvailabilityNumber
  // where availability_count < 1
  // `)
  //   );
  const MIGRATION_SQL = fs
    .readFileSync(__dirname + "/../prisma/migrations/20211115182559_availability_issue/migration.sql")
    .toString();
  await prisma.$queryRaw(MIGRATION_SQL);

  return NaN;
}
afterAll(async () => {
  await prisma.$disconnect();
});
test("tmpMigration", async () => {
  const ONE_MINUTE_BEFORE_MIDNIGHT = 1440 - 1;
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
      name: "europeanUser0to1380",
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: 1380, // 23:00
      timeZone: "Europe/London",
    },
  });

  const americanUser = await prisma.user.create({
    data: {
      name: "americanUser0toONE_MINUTE_BEFORE_MIDNIGHT",
      email: `${randomString()}@example.com`,
      startTime: 0, // midnight
      endTime: ONE_MINUTE_BEFORE_MIDNIGHT, // midnight
      timeZone: "America/Los_Angeles",
    },
  });
  const baseDate = dayjs.utc().set("hour", 0).set("minute", 0).set("second", 0).set("millisecond", 0);

  const unaffectedUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
      name: "unaffectedUser0toONE_MINUTE_BEFORE_MIDNIGHTu",
      startTime: 0, // midnight
      endTime: ONE_MINUTE_BEFORE_MIDNIGHT, // midnight
      timeZone: "America/Los_Angeles",
      availability: {
        create: {
          startTime: baseDate.add(9, "hour").toDate(),
          endTime: baseDate.add(17, "hour").toDate(),
        },
      },
    },
  });

  const weirdUser = await prisma.user.create({
    data: {
      email: `${randomString()}@example.com`,
      name: "weirdUser",
      startTime: 54000,
      endTime: 96000,
      timeZone: "America/Los_Angeles",
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
          weirdUser.id,
        ],
      },
    },
    select: {
      name: true,
      startTime: true,
      endTime: true,
      timeZone: true,
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
        "name": "europeanUser0to1380",
        "startTime": 0,
        "timeZone": "Europe/London",
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
            "endTime": "1970-01-01T23:59:00.000Z",
            "startTime": "1970-01-01T00:00:00.000Z",
          },
        ],
        "endTime": 1439,
        "name": "americanUser0toONE_MINUTE_BEFORE_MIDNIGHT",
        "startTime": 0,
        "timeZone": "America/Los_Angeles",
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
        "endTime": 1439,
        "name": "unaffectedUser0toONE_MINUTE_BEFORE_MIDNIGHTu",
        "startTime": 0,
        "timeZone": "America/Los_Angeles",
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
            "endTime": "1970-01-01T16:00:00.000Z",
            "startTime": "1970-01-01T12:00:00.000Z",
          },
        ],
        "endTime": 96000,
        "name": "weirdUser",
        "startTime": 54000,
        "timeZone": "America/Los_Angeles",
      },
    ]
  `);
});
