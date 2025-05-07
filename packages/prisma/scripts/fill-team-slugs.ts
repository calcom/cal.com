import { PrismaClient } from "@prisma/client";

import slugify from "../../lib/slugify";

const prisma = new PrismaClient();

async function main() {
  // Fetch all teams where slug is null or empty string
  const teams = await prisma.team.findMany({
    where: {
      OR: [{ slug: null }, { slug: "" }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (teams.length === 0) {
    console.log("No teams found with empty or null slug.");
    return;
  }

  console.log(`Found ${teams.length} teams to update.`);

  for (const team of teams) {
    if (!team.name) {
      console.warn(`Team with id ${team.id} has no name. Skipping.`);
      continue;
    }
    const newSlug = slugify(team.name);
    if (!newSlug) {
      console.warn(`Could not generate slug for team id ${team.id} (name: "${team.name}"). Skipping.`);
      continue;
    }
    try {
      await prisma.team.update({
        where: { id: team.id },
        data: { slug: newSlug },
      });
      console.log(`Updated team id ${team.id}: slug set to '${newSlug}'`);
    } catch (error) {
      console.error(`Failed to update team id ${team.id}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
