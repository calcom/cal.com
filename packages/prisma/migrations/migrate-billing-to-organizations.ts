import { PrismaClient } from "@prisma/client";

import { userMetadata } from "../zod-utils";

const prisma = new PrismaClient();

interface MigrationResult {
  organizationsProcessed: number;
  customerIdsMigrated: number;
  errors: string[];
}

export async function migrateBillingToOrganizations(): Promise<MigrationResult> {
  const result: MigrationResult = {
    organizationsProcessed: 0,
    customerIdsMigrated: 0,
    errors: [],
  };

  console.log("Starting migration of billing data from users to organizations...");

  try {
    const organizations = await prisma.team.findMany({
      where: {
        isOrganization: true,
        stripeCustomerId: null,
      },
      select: {
        id: true,
        name: true,
        members: {
          where: {
            accepted: true,
            role: { in: ["OWNER", "ADMIN"] },
          },
          orderBy: {
            createdAt: "asc", // Get the earliest owner/admin (likely the creator)
          },
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                metadata: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${organizations.length} organizations to process`);

    for (const organization of organizations) {
      result.organizationsProcessed++;

      try {
        const owner = organization.members[0]?.user;
        if (!owner) {
          result.errors.push(`Organization ${organization.id} (${organization.name}) has no owner/admin`);
          continue;
        }

        const parsedMetadata = owner.metadata ? userMetadata.parse(owner.metadata) : undefined;
        const stripeCustomerId = parsedMetadata?.stripeCustomerId;

        if (!stripeCustomerId) {
          console.log(
            `Organization ${organization.id} owner ${owner.email} has no stripeCustomerId, skipping`
          );
          continue;
        }

        await prisma.team.update({
          where: { id: organization.id },
          data: { stripeCustomerId },
        });

        result.customerIdsMigrated++;
        console.log(
          `Migrated stripeCustomerId ${stripeCustomerId} from user ${owner.email} to organization ${organization.id} (${organization.name})`
        );

        const platformBillingUpdated = await prisma.platformBilling.updateMany({
          where: {
            customerId: stripeCustomerId,
            teamId: null, // Only update records not already associated with a team
          },
          data: {
            teamId: organization.id,
          },
        });

        if (platformBillingUpdated.count > 0) {
          console.log(
            `Updated ${platformBillingUpdated.count} PlatformBilling records for organization ${organization.id}`
          );
        }
      } catch (error) {
        const errorMessage = `Error processing organization ${organization.id}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    console.log("Migration completed successfully");
    console.log(
      `Summary: ${result.organizationsProcessed} organizations processed, ${result.customerIdsMigrated} customer IDs migrated`
    );

    if (result.errors.length > 0) {
      console.log(`Errors encountered: ${result.errors.length}`);
      result.errors.forEach((error) => console.error(`- ${error}`));
    }
  } catch (error) {
    const errorMessage = `Fatal error during migration: ${
      error instanceof Error ? error.message : String(error)
    }`;
    result.errors.push(errorMessage);
    console.error(errorMessage);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

if (require.main === module) {
  migrateBillingToOrganizations()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
