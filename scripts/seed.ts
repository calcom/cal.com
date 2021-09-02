import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "testuser@example.com";
  const username = "testuser";
  const password = "testpassword";

  const obj: Prisma.UserCreateArgs["data"] = {
    username,
    password,
    emailVerified: new Date(),
  };

  await prisma.user.upsert({
    where: { email },
    update: obj,
    create: obj,
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
