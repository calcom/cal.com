import { hashPassword } from "../lib/auth";
import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function createUserAndEventType(opts: {
  user: Omit<Prisma.UserCreateArgs["data"], "password" | "email"> & { password: string; email: string };
  eventTypes: Array<Prisma.EventTypeCreateArgs["data"]>;
}) {
  const userData: Prisma.UserCreateArgs["data"] = {
    ...opts.user,
    password: await hashPassword(opts.user.password),
    emailVerified: new Date(),
    completedOnboarding: true,
  };
  const user = await prisma.user.upsert({
    where: { email: opts.user.email },
    update: userData,
    create: userData,
  });

  console.log(
    `👤 Upserted '${opts.user.username}' with email "${opts.user.email}" & password "${opts.user.password}". Booking page 👉 http://localhost:3000/${opts.user.username}`
  );
  for (const rawData of opts.eventTypes) {
    const eventTypeData: Prisma.EventTypeCreateArgs["data"] = { ...rawData };
    eventTypeData.userId = user.id;
    await prisma.eventType.upsert({
      where: {
        userId_slug: {
          slug: eventTypeData.slug,
          userId: user.id,
        },
      },
      update: eventTypeData,
      create: eventTypeData,
    });
    console.log(
      `\t📆 Event type ${eventTypeData.slug}, length ${eventTypeData.length}: http://localhost:3000/${user.username}/${eventTypeData.slug}`
    );
  }
}

async function main() {
  await createUserAndEventType({
    user: {
      email: "free@example.com",
      password: "free",
      username: "free",
      plan: "FREE",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });

  await createUserAndEventType({
    user: {
      email: "free-first-hidden@example.com",
      password: "free-first-hidden",
      username: "free-first-hidden",
      plan: "FREE",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
        hidden: true,
      },
      {
        title: "60min",
        slug: "60min",
        length: 30,
      },
    ],
  });
  await createUserAndEventType({
    user: {
      email: "pro@example.com",
      password: "pro",
      username: "pro",
      plan: "PRO",
    },

    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
      },
    ],
  });
  await createUserAndEventType({
    user: {
      email: "trial@example.com",
      password: "trial",
      username: "trial",
      plan: "TRIAL",
    },
    eventTypes: [
      {
        title: "30min",
        slug: "30min",
        length: 30,
      },
      {
        title: "60min",
        slug: "60min",
        length: 60,
      },
    ],
  });

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log("🌱 Seeded db");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
