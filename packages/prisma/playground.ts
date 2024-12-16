import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// @ts-expect-error type mismatch
prisma.$on("query", (e) => {
  // @ts-expect-error type mismatch
  console.log("Parameters:", e.params);
});

async function main() {
  // This is a playground to test prisma queries
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
