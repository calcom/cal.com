/**
 * Script to enable the workflows feature flag in the database
 * Run with: npx tsx scripts/enable-workflows-flag.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function enableWorkflowsFlag() {
  try {
    // Check if the workflows flag exists
    const existingFlag = await prisma.feature.findUnique({
      where: { slug: "workflows" },
    });

    if (existingFlag) {
      if (existingFlag.enabled) {
        console.log("✅ Workflows feature flag is already enabled");
      } else {
        // Update it to enabled
        await prisma.feature.update({
          where: { slug: "workflows" },
          data: { enabled: true },
        });
        console.log("✅ Workflows feature flag has been enabled");
      }
    } else {
      // Create it with enabled = true
      await prisma.feature.create({
        data: {
          slug: "workflows",
          enabled: true,
          description: "Enable workflows for this instance",
          type: "OPERATIONAL",
        },
      });
      console.log("✅ Workflows feature flag has been created and enabled");
    }
  } catch (error) {
    console.error("❌ Error enabling workflows flag:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableWorkflowsFlag();
