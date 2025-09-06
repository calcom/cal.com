import { PrismaClient } from "@prisma/client";

import { UserPlan } from "@calcom/prisma/enums";

const prisma = new PrismaClient();

async function populateUserPlans() {
  console.log("Starting user plan population...");

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  for (const user of users) {
    try {
      const memberships = await prisma.membership.findMany({
        where: {
          userId: user.id,
          accepted: true,
        },
        include: {
          team: {
            include: {
              platformBilling: {
                select: {
                  plan: true,
                },
              },
            },
          },
        },
      });

      let userPlan = null;

      for (const membership of memberships) {
        const team = membership.team;
        if (team.isPlatform && team.isOrganization && team.platformBilling?.plan) {
          switch (team.platformBilling.plan) {
            case "STARTER":
              userPlan = UserPlan.PLATFORM_STARTER;
              break;
            case "ESSENTIALS":
              userPlan = UserPlan.PLATFORM_ESSENTIALS;
              break;
            case "SCALE":
              userPlan = UserPlan.PLATFORM_SCALE;
              break;
            case "ENTERPRISE":
              userPlan = UserPlan.PLATFORM_ENTERPRISE;
              break;
          }
          if (userPlan) break;
        }
      }

      if (!userPlan) {
        for (const membership of memberships) {
          const team = membership.team;
          if (team.isOrganization && !team.isPlatform) {
            userPlan = UserPlan.ORGANIZATIONS;
            break;
          }
        }
      }

      if (!userPlan) {
        for (const membership of memberships) {
          const team = membership.team;
          if (!team.isOrganization) {
            userPlan = UserPlan.TEAMS;
            break;
          }
        }
      }

      if (!userPlan) {
        userPlan = UserPlan.INDIVIDUALS;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { plan: userPlan },
      });

      console.log(`Updated user ${user.email} with plan: ${userPlan}`);
    } catch (error) {
      console.error(`Error updating user ${user.email}:`, error);
    }
  }

  console.log("User plan population completed!");
}

populateUserPlans().catch(console.error);
