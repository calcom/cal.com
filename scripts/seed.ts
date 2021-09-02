import { hashPassword } from "../lib/auth";
import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "testuser@example.com";
  const username = "testuser";
  const password = await hashPassword("testpassword");

  const userData: Prisma.UserCreateArgs["data"] = {
    email,
    username,
    password,
    emailVerified: new Date(),
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: userData,
    create: userData,
  });

  const eventTypeData: Prisma.EventTypeCreateArgs["data"] = {
    title: "30min",
    slug: "30min",
    length: 30,
    userId: user.id,
  };

  await prisma.eventType.upsert({
    where: {
      userId_slug: {
        slug: "30min",
        userId: user.id,
      },
    },
    update: eventTypeData,
    create: eventTypeData,
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
