import { PrismaClient } from "@prisma/client";

import { SchedulingType } from "@calcom/prisma/enums";

const prisma = new PrismaClient();

interface DiscrepancyReport {
  eventTypeId: number;
  teamId: number;
  eventTypeTitle: string;
  teamName: string;
  orphanedHosts: { userId: number; email: string }[];
  missingHosts: { userId: number; email: string; membershipId: number }[];
}

async function findDiscrepancies(): Promise<DiscrepancyReport[]> {
  const eventTypes = await prisma.eventType.findMany({
    where: {
      teamId: { not: null },
      assignAllTeamMembers: true,
      schedulingType: { in: [SchedulingType.ROUND_ROBIN, SchedulingType.COLLECTIVE] },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      hosts: {
        select: {
          userId: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  const discrepancies: DiscrepancyReport[] = [];

  for (const eventType of eventTypes) {
    if (!eventType.team) continue;

    const acceptedMemberships = await prisma.membership.findMany({
      where: {
        teamId: eventType.teamId!,
        accepted: true,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    const hostUserIds = new Set(eventType.hosts.map((h) => h.userId));
    const memberUserIds = new Set(acceptedMemberships.map((m) => m.userId));

    const orphanedHosts = eventType.hosts
      .filter((h) => !memberUserIds.has(h.userId))
      .map((h) => ({ userId: h.userId, email: h.user.email }));

    const missingHosts = acceptedMemberships
      .filter((m) => !hostUserIds.has(m.userId))
      .map((m) => ({ userId: m.userId, email: m.user.email, membershipId: m.id }));

    if (orphanedHosts.length > 0 || missingHosts.length > 0) {
      discrepancies.push({
        eventTypeId: eventType.id,
        teamId: eventType.teamId!,
        eventTypeTitle: eventType.title,
        teamName: eventType.team.name,
        orphanedHosts,
        missingHosts,
      });
    }
  }

  return discrepancies;
}

async function fixDiscrepancies(discrepancies: DiscrepancyReport[], dryRun: boolean): Promise<void> {
  for (const discrepancy of discrepancies) {
    console.log(`\nProcessing EventType ${discrepancy.eventTypeId} (${discrepancy.eventTypeTitle}) for Team ${discrepancy.teamName}`);

    if (discrepancy.orphanedHosts.length > 0) {
      console.log(`  Removing ${discrepancy.orphanedHosts.length} orphaned hosts:`);
      for (const host of discrepancy.orphanedHosts) {
        console.log(`    - User ${host.userId} (${host.email})`);
      }

      if (!dryRun) {
        await prisma.host.deleteMany({
          where: {
            eventTypeId: discrepancy.eventTypeId,
            userId: { in: discrepancy.orphanedHosts.map((h) => h.userId) },
          },
        });
      }
    }

    if (discrepancy.missingHosts.length > 0) {
      const eventType = await prisma.eventType.findUnique({
        where: { id: discrepancy.eventTypeId },
        select: { schedulingType: true },
      });

      const isFixed = eventType?.schedulingType === SchedulingType.COLLECTIVE;

      console.log(`  Adding ${discrepancy.missingHosts.length} missing hosts (isFixed=${isFixed}):`);
      for (const host of discrepancy.missingHosts) {
        console.log(`    - User ${host.userId} (${host.email})`);
      }

      if (!dryRun) {
        await prisma.host.createMany({
          data: discrepancy.missingHosts.map((h) => ({
            userId: h.userId,
            eventTypeId: discrepancy.eventTypeId,
            isFixed,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  console.log("=".repeat(80));
  console.log("Host-Membership Sync Fix Script");
  console.log("=".repeat(80));
  console.log(`Mode: ${dryRun ? "DRY RUN (use --apply to make changes)" : "APPLYING CHANGES"}`);
  console.log("");

  console.log("Finding discrepancies...");
  const discrepancies = await findDiscrepancies();

  if (discrepancies.length === 0) {
    console.log("\nNo discrepancies found. All hosts are in sync with memberships.");
    return;
  }

  console.log(`\nFound ${discrepancies.length} event types with discrepancies:`);

  let totalOrphaned = 0;
  let totalMissing = 0;

  for (const d of discrepancies) {
    totalOrphaned += d.orphanedHosts.length;
    totalMissing += d.missingHosts.length;
    console.log(`  - EventType ${d.eventTypeId} (${d.eventTypeTitle}): ${d.orphanedHosts.length} orphaned, ${d.missingHosts.length} missing`);
  }

  console.log(`\nSummary: ${totalOrphaned} orphaned hosts to remove, ${totalMissing} missing hosts to add`);

  await fixDiscrepancies(discrepancies, dryRun);

  if (dryRun) {
    console.log("\n" + "=".repeat(80));
    console.log("DRY RUN COMPLETE - No changes were made");
    console.log("Run with --apply to apply the fixes");
    console.log("=".repeat(80));
  } else {
    console.log("\n" + "=".repeat(80));
    console.log("FIXES APPLIED SUCCESSFULLY");
    console.log("=".repeat(80));
  }
}

main()
  .catch((e) => {
    console.error("Error running script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
