import { prisma } from "@calcom/prisma";
import { UserPlan } from "@calcom/prisma/enums";

import { MembershipRepository } from "./server/repository/membership";

export class UserPlanUtils {
  static async getUserPlan(userId: number): Promise<UserPlan | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return user?.plan || null;
  }

  static async userHasPlan(userId: number, plan: UserPlan): Promise<boolean> {
    const userPlan = await this.getUserPlan(userId);
    return userPlan === plan;
  }

  static async userHasPlatformPlan(userId: number): Promise<boolean> {
    const userPlan = await this.getUserPlan(userId);
    return userPlan
      ? [
          UserPlan.PLATFORM_STARTER,
          UserPlan.PLATFORM_ESSENTIALS,
          UserPlan.PLATFORM_SCALE,
          UserPlan.PLATFORM_ENTERPRISE,
        ].includes(userPlan)
      : false;
  }

  static async updateUserPlan(userId: number): Promise<UserPlan | null> {
    const teams = await MembershipRepository.findAllAcceptedTeamMemberships(userId);

    let userPlan: UserPlan | null = null;

    for (const team of teams) {
      if (team.isPlatform && team.isOrganization) {
        const platformBilling = await prisma.platformBilling.findUnique({
          where: { id: team.id },
        });

        if (platformBilling?.plan) {
          switch (platformBilling.plan) {
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
    }

    if (!userPlan) {
      for (const team of teams) {
        if (team.isOrganization && !team.isPlatform) {
          userPlan = UserPlan.ORGANIZATIONS;
          break;
        }
      }
    }

    if (!userPlan) {
      for (const team of teams) {
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
      where: { id: userId },
      data: { plan: userPlan },
    });

    return userPlan;
  }
}
