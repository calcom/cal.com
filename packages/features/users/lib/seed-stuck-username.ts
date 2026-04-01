#!/usr/bin/env npx tsx
/**
 * Seed script to reproduce the "stuck username in org" bug.
 *
 * Scenario:
 *   1. An org "firmplus" exists
 *   2. A user had username "stuckuser" on the platform
 *   3. They joined the org, which created a Profile with username "stuckuser" under the org
 *   4. A TempOrgRedirect was created to redirect cal.com/stuckuser → org.cal.com/stuckuser
 *   5. The user deleted their account — User row is gone (cascade deletes Profile)
 *   6. But the TempOrgRedirect survives, blocking anyone from claiming "stuckuser"
 *
 * This script seeds the *state after deletion* so you can test the Release Username admin action.
 *
 * Usage:
 *   npx tsx packages/features/users/lib/seed-stuck-username.ts
 *   npx tsx packages/features/users/lib/seed-stuck-username.ts --cleanup
 */

import { prisma } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

const STUCK_USERNAME = "stuckuser";
const ORG_NAME = "Seed Org (stuck username)";
const ORG_SLUG = "seed-stuck-username-org";

// Also seed a variant where the Profile itself is orphaned (user still exists but wants username released)
const ORPHAN_EMAIL = "orphan-seed@example.com";
const ORPHAN_USERNAME = "stuckorphan";

async function cleanup() {
  console.log("🧹 Cleaning up seed data...");

  // Remove TempOrgRedirects
  await prisma.tempOrgRedirect.deleteMany({
    where: { from: { in: [STUCK_USERNAME, ORPHAN_USERNAME] }, type: RedirectType.User },
  });

  // Remove profiles for orphan user
  const orphanUser = await prisma.user.findFirst({ where: { email: ORPHAN_EMAIL } });
  if (orphanUser) {
    await prisma.profile.deleteMany({ where: { userId: orphanUser.id } });
    await prisma.membership.deleteMany({ where: { userId: orphanUser.id } });
    await prisma.user.delete({ where: { id: orphanUser.id } });
  }

  // Remove seeded org
  const org = await prisma.team.findFirst({ where: { slug: ORG_SLUG, parentId: null } });
  if (org) {
    await prisma.team.delete({ where: { id: org.id } });
  }

  console.log("✅ Cleanup complete");
}

async function seed() {
  console.log("🌱 Seeding stuck username scenario...\n");

  // 1. Create the org
  let org = await prisma.team.findFirst({
    where: { slug: ORG_SLUG, parentId: null },
    select: { id: true, name: true, slug: true },
  });
  if (!org) {
    org = await prisma.team.create({
      data: {
        name: ORG_NAME,
        slug: ORG_SLUG,
        isOrganization: true,
        metadata: {},
      },
      select: { id: true, name: true, slug: true },
    });
  }
  console.log(`  ✅ Org created: ${org.name} (id: ${org.id}, slug: ${org.slug})`);

  // 2. Seed a TempOrgRedirect for the deleted user's username
  //    This is the record that survives user deletion and blocks username reuse
  const redirect = await prisma.tempOrgRedirect.upsert({
    where: {
      from_type_fromOrgId: {
        from: STUCK_USERNAME,
        type: RedirectType.User,
        fromOrgId: 0,
      },
    },
    update: {},
    create: {
      from: STUCK_USERNAME,
      fromOrgId: 0,
      type: RedirectType.User,
      toUrl: `${ORG_SLUG}.cal.com/${STUCK_USERNAME}`,
      enabled: true,
    },
  });
  console.log(
    `  ✅ TempOrgRedirect created: cal.com/${STUCK_USERNAME} → ${redirect.toUrl} (id: ${redirect.id})`
  );
  console.log(`     This blocks anyone from registering username "${STUCK_USERNAME}"\n`);

  // 3. Seed an orphan variant: user still exists, but has a Profile holding the username in the org
  const orphanUser = await prisma.user.upsert({
    where: { email: ORPHAN_EMAIL },
    update: {},
    create: {
      email: ORPHAN_EMAIL,
      username: ORPHAN_USERNAME,
      organizationId: org.id,
    },
    select: { id: true, email: true, username: true },
  });
  console.log(`  ✅ Orphan user created: ${orphanUser.email} (id: ${orphanUser.id})`);

  // Create a membership so Profile doesn't violate FK
  await prisma.membership.upsert({
    where: {
      userId_teamId: { userId: orphanUser.id, teamId: org.id },
    },
    update: {},
    create: {
      userId: orphanUser.id,
      teamId: org.id,
      role: "MEMBER",
      accepted: true,
    },
  });

  const profile = await prisma.profile.upsert({
    where: {
      userId_organizationId: { userId: orphanUser.id, organizationId: org.id },
    },
    update: {},
    create: {
      uid: `seed-${ORPHAN_USERNAME}`,
      userId: orphanUser.id,
      organizationId: org.id,
      username: ORPHAN_USERNAME,
    },
    select: { id: true, username: true, organizationId: true },
  });
  console.log(
    `  ✅ Profile created: username="${profile.username}" in org ${profile.organizationId} (id: ${profile.id})`
  );

  // Also add a redirect for this username
  await prisma.tempOrgRedirect.upsert({
    where: {
      from_type_fromOrgId: {
        from: ORPHAN_USERNAME,
        type: RedirectType.User,
        fromOrgId: 0,
      },
    },
    update: {},
    create: {
      from: ORPHAN_USERNAME,
      fromOrgId: 0,
      type: RedirectType.User,
      toUrl: `${ORG_SLUG}.cal.com/${ORPHAN_USERNAME}`,
      enabled: true,
    },
  });
  console.log(`  ✅ TempOrgRedirect created for "${ORPHAN_USERNAME}" too\n`);

  console.log("📋 Summary — two scenarios to test:\n");
  console.log(`  1. DELETED USER (TempOrgRedirect only):`);
  console.log(`     Username: "${STUCK_USERNAME}"`);
  console.log(`     Org ID: leave empty (global namespace)`);
  console.log(`     → Should find 1 TempOrgRedirect blocking record\n`);
  console.log(`  2. ORPHAN PROFILE (Profile + User + TempOrgRedirect):`);
  console.log(`     Username: "${ORPHAN_USERNAME}"`);
  console.log(`     Org ID: ${org.id}`);
  console.log(`     → Should find Profile + User + TempOrgRedirect blocking records\n`);
  console.log("🚀 Go to /admin/data/profiles or /admin/data/users and use the Release Username action");
}

async function main() {
  if (process.argv.includes("--cleanup")) {
    await cleanup();
  } else {
    await seed();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
