import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import prisma from "../lib/prisma";
import { randomString } from "../playwright/lib/testUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

async function tmpMigration() {
  await prisma.$queryRaw(`
    insert into "Availability" ("userId", "startTime", "endTime", "days")
    select
      id as "userId", 
      CAST(CONCAT(CAST(("startTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
      CAST(CONCAT(CAST(("endTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
      ARRAY [0,1,2,3,4,5,6]
    from 
      (
        select 
          users.id, 
          users."startTime", 
          users."endTime", 
          users."timeZone",
          count("Availability".id) as availability_count
        from users 
        left join "Availability" on "Availability"."userId" = users.id
        where users."timeZone" != ''
        group by users.id
      ) usersWithAvailabilityNumber
    where availability_count < 1
  `);

  return NaN;
}
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
      endTime: 1380, // midnight
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
