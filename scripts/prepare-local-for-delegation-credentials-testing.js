#!/usr/bin/env node
/**
 * This script is used to prepare local environment for delegation credentials testing.
 * It prepares Acme organization and its owner user with email owner1-acme@example.com to test Delegation Credentials with Calendar Cache
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Parse newEmail from args
  const newEmail = process.argv[2] || "hariom@cal.com";
  console.log(`Using newEmail: ${newEmail}`);

  // 1. Update user email
  let user = await prisma.user.findUnique({
    where: { email: "owner1-acme@example.com" },
  });
  if (!user) {
    // Check if user with newEmail exists
    user = await prisma.user.findUnique({ where: { email: newEmail } });
    if (user) {
      console.log(`User with newEmail (${newEmail}) already exists. Skipping email update step.`);
    } else {
      console.error(
        "User with email owner1-acme@example.com not found, and user with newEmail also not found."
      );
      process.exit(1);
    }
  } else {
    if (user.email !== newEmail) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });
      console.log(`Updated user email to ${newEmail}`);
    } else {
      console.log("User email already set to newEmail, skipping update.");
    }
  }

  // 2. Find organization (Team)
  const org = await prisma.team.findFirst({
    where: { slug: "acme", isOrganization: true },
  });
  if (!org) {
    console.error("Organization (Team) with slug=acme and isOrganization=true not found.");
    process.exit(1);
  }
  console.log(`Found organization: id=${org.id}, slug=${org.slug}`);

  // 3. Ensure TeamFeatures: delegation-credential
  const delegationFeature = await prisma.teamFeatures.findUnique({
    where: {
      teamId_featureId: {
        teamId: org.id,
        featureId: "delegation-credential",
      },
      enabled: true,
    },
  });
  if (!delegationFeature) {
    await prisma.teamFeatures.create({
      data: {
        teamId: org.id,
        featureId: "delegation-credential",
        assignedAt: new Date(),
        assignedBy: "prepare-local-script",
        enabled: true,
      },
    });
    console.log("Created TeamFeatures: delegation-credential");
  } else {
    console.log("TeamFeatures: delegation-credential already exists, skipping.");
  }

  // 4. Ensure TeamFeatures: calendar-cache
  const calendarCacheFeature = await prisma.teamFeatures.findUnique({
    where: {
      teamId_featureId: {
        teamId: org.id,
        featureId: "calendar-cache",
      },
      enabled: true,
    },
  });
  if (!calendarCacheFeature) {
    await prisma.teamFeatures.create({
      data: {
        teamId: org.id,
        featureId: "calendar-cache",
        assignedAt: new Date(),
        assignedBy: "prepare-local-script",
        enabled: true,
      },
    });
    console.log("Created TeamFeatures: calendar-cache");
  } else {
    console.log("TeamFeatures: calendar-cache already exists, skipping.");
  }

  // 5. Add WorkspacePlatform record
  const workspacePlatform = await prisma.workspacePlatform.findUnique({
    where: { slug: "google" },
  });
  if (!workspacePlatform) {
    await prisma.workspacePlatform.create({
      data: {
        slug: "google",
        name: "Google",
        enabled: true,
        description: "Google Workspace Platform",
        defaultServiceAccountKey: {}, // Empty object, update as needed
      },
    });
    console.log("Created WorkspacePlatform: google");
  } else {
    console.log("WorkspacePlatform: google already exists, skipping.");
  }

  // 6. Enable Feature records for 'calendar-cache' and 'delegation-credential'
  const featureSlugs = ["calendar-cache", "delegation-credential"];
  for (const slug of featureSlugs) {
    const feature = await prisma.feature.findUnique({ where: { slug } });
    if (!feature) {
      console.error(`Feature with slug ${slug} not found.`);
      process.exit(1);
    }
    if (!feature.enabled) {
      await prisma.feature.update({ where: { slug }, data: { enabled: true } });
      console.log(`Enabled Feature: ${slug}`);
    } else {
      console.log(`Feature: ${slug} already enabled, skipping.`);
    }
  }
  console.log(`Now you can sign in with ${newEmail} and create a new Delegation Credential.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
