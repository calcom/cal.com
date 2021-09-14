import { hashPassword } from "../lib/auth";
import { Prisma, PrismaClient, UserPlan } from "@prisma/client";
import dayjs from "dayjs";
import { uuid } from "short-uuid";
const prisma = new PrismaClient();

async function createBookingForEventType(opts: {
  uid: string;
  title: string;
  slug: string;
  startTime: Date | string;
  endTime: Date | string;
  userEmail: string;
}) {
  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: opts.slug,
    },
  });

  if (!eventType) {
    // should not happen
    throw new Error("Eventtype missing");
  }

  const bookingData: Prisma.BookingCreateArgs["data"] = {
    uid: opts.uid,
    title: opts.title,
    startTime: opts.startTime,
    endTime: opts.endTime,
    user: {
      connect: {
        email: opts.userEmail,
      },
    },
    attendees: {
      create: {
        email: opts.userEmail,
        name: "Some name",
        timeZone: "Europe/London",
      },
    },
    eventType: {
      connect: {
        id: eventType.id,
      },
    },
  };

  await prisma.booking.create({
    data: bookingData,
  });
}

async function createUserAndEventType(opts: {
  user: { email: string; password: string; username: string; plan: UserPlan };
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

    const eventType = await prisma.eventType.findFirst({
      where: {
        slug: eventTypeData.slug,
        users: {
          some: {
            id: eventTypeData.userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (eventType) {
      await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: eventTypeData,
      });
    } else {
      await prisma.eventType.create({
        data: eventTypeData,
      });
    }

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

  await createBookingForEventType({
    title: "30min",
    slug: "30min",
    startTime: dayjs().add(1, "day").toDate(),
    endTime: dayjs().add(1, "day").add(60, "minutes").toDate(),
    uid: uuid(),
    userEmail: "pro@example.com",
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
