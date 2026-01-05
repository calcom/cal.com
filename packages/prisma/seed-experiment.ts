import { PrismaClient } from "./generated/prisma/client/index.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating test experiment...");

  await prisma.feature.upsert({
    where: { slug: "test-experiment" },
    update: {},
    create: {
      slug: "test-experiment",
      type: "EXPERIMENT",
      enabled: true,
      description: "Test experiment for playground demo",
      metadata: {
        variants: [
          { name: "control", percentage: 50 },
          { name: "treatment", percentage: 50 },
        ],
        assignmentType: "DETERMINISTIC",
      },
    },
  });

  console.log("✅ Test experiment created!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
