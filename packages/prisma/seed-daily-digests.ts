import { faker } from "@faker-js/faker";
import { uuid } from "short-uuid";

import dayjs from "@calcom/dayjs";

import prisma from ".";
import { createUserAndEventType } from "./seed";

async function main() {
  // Add a lot of users who are opted into daily digests, with bookings due in the next day. Useful to stress-test daily digest emails (adjust length as required for testing)
  await Promise.all(
    Array.from({ length: 100 }, async () => {
      const name = faker.person.fullName();
      const timeZone = faker.location.timeZone();
      await createUserAndEventType({
        user: {
          email: faker.internet.exampleEmail(),
          password: faker.internet.password(),
          username: faker.internet.userName(),
          name,
          timeZone,
          dailyDigestEnabled: true,
          dailyDigestTime: dayjs().toDate(), // Not all entries will be "now" because they'll be interpreted as per their timezone. I can't figure out how to save the current time in another timezone
        },
        eventTypes: [
          {
            title: "30min",
            slug: "30min",
            length: 30,
            _bookings: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, (_, i) => {
              const guest = faker.person.fullName();
              const startTime = faker.date.soon();
              const endTime = dayjs(startTime).add(30, "minutes").toDate();

              return {
                uid: uuid(),
                title: `30min between ${name} and ${guest}`,
                startTime,
                endTime,
              };
            }),
          },
        ],
      });
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
