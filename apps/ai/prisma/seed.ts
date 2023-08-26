import { env } from "process";

import prisma from "../src/utils/prisma";

export const DUMMY_USERS = {
  alice: {
    email: "alice@acme.so",
    timezone: "America/New_York",
    username: "dexter",
  },
  bob: {
    apiKey: "cal_test_abc123",
    email: "bob@betakit.so",
    timezone: "Asia/Tokyo",
    username: "tedspare", // TODO: replace with real key of open testing account and commit to main
  },
};

async function main() {
  try {
    // Alice is an unauthorized guest
    const alice = await prisma.user.upsert({
      create: DUMMY_USERS.alice,
      update: {},
      where: { email: DUMMY_USERS.alice.email },
    });

    // Bob can take authorized actions
    const bob = await prisma.user.upsert({
      create: {
        ...DUMMY_USERS.bob,
        apiKey: DUMMY_USERS.bob.apiKey,
      },
      update: {},
      where: { email: DUMMY_USERS.bob.email },
    });

    // Enter your email, username and API key in .env to seed this user
    const dev = env.SEED_CAL_EMAIL
      ? await prisma.user.upsert({
          create: {
            apiKey: env.SEED_CAL_API_KEY,
            email: env.SEED_CAL_EMAIL,
            username: env.SEED_CAL_USERNAME,
          },
          update: {},
          where: { email: env.SEED_CAL_EMAIL },
        })
      : undefined;

    console.log({ alice, bob, dev });
  } catch (error) {
    console.error(error);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);

    await prisma.$disconnect();

    process.exit(1);
  });
