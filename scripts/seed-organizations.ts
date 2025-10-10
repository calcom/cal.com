import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

/**
 * Seeds the database with test organizations for testing pagination
 * Creates 50+ organizations with varying statuses
 */
export async function seedOrganizations() {
  console.log("🏢 Creating test organizations for pagination testing...");

  const orgCount = 60;
  const hashedPassword = await hashPassword("password123");

  // Create organizations in batches
  for (let i = 1; i <= orgCount; i++) {
    const slug = `test-org-${i}`;

    // Check if organization already exists
    const existingOrg = await prisma.team.findFirst({
      where: {
        slug,
        isOrganization: true,
      },
    });

    if (existingOrg) {
      console.log(`⚠️  Organization ${slug} already exists, skipping...`);
      continue;
    }

    // Vary the organization statuses
    const isReviewed = i % 3 !== 0; // ~66% reviewed
    const isDnsConfigured = i % 4 !== 0; // ~75% DNS configured
    const isPublished = i % 5 !== 0; // ~80% published
    const hasAdminApi = i % 7 !== 0; // ~85% have admin API

    console.log(`Creating organization ${i}/${orgCount}: ${slug}`);

    // Create organization
    const organization = await prisma.team.create({
      data: {
        name: `Test Organization ${i}`,
        slug: isPublished ? slug : null,
        isOrganization: true,
        metadata: {
          isOrganization: true,
          requestedSlug: slug,
        },
        organizationSettings: {
          create: {
            isOrganizationVerified: true,
            orgAutoAcceptEmail: `test-org-${i}.com`,
            isAdminAPIEnabled: hasAdminApi,
            isAdminReviewed: isReviewed,
            isOrganizationConfigured: isDnsConfigured,
          },
        },
      },
    });

    // Create owner user for the organization
    const ownerEmail = `owner-${i}@test-org-${i}.com`;

    // Check if user already exists
    let ownerUser = await prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          email: ownerEmail,
          username: `owner-org-${i}`,
          name: `Owner ${i}`,
          emailVerified: new Date(),
          password: {
            create: {
              hash: hashedPassword,
            },
          },
        },
      });

      // Create default availability schedule
      await prisma.schedule.create({
        data: {
          name: "Default Schedule",
          userId: ownerUser.id,
          availability: {
            createMany: {
              data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
            },
          },
        },
      });
    }

    // Add owner to organization
    await prisma.membership.create({
      data: {
        userId: ownerUser.id,
        teamId: organization.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    if (i % 10 === 0) {
      console.log(`✅ Created ${i}/${orgCount} organizations`);
    }
  }

  console.log("🎉 Organization seeding complete!");
  console.log(`Created ${orgCount} test organizations`);
  console.log("\n📊 Organization Distribution:");
  console.log(`   • ~66% Reviewed`);
  console.log(`   • ~75% DNS Configured`);
  console.log(`   • ~80% Published`);
  console.log(`   • ~85% Admin API Enabled`);
  console.log("\n🔑 All owner accounts use password: password123");
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedOrganizations()
    .then(() => {
      console.log("✅ Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export default seedOrganizations;
