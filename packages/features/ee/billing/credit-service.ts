import dayjs from "@calcom/dayjs";
import {
  sendCreditBalanceLimitReachedEmails,
  sendCreditBalanceLowWarningEmails,
} from "@calcom/emails/email-manager";
import { StripeBillingService } from "@calcom/features/ee/billing/stripe-billling-service";
import { InternalTeamBilling } from "@calcom/features/ee/billing/teams/internal-team-billing";
import { cancelScheduledMessagesAndScheduleEmails } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import { prisma } from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[CreditService]"] });

export class CreditService {
  async chargeCredits({
    userId,
    teamId,
    credits,
    bookingUid,
    smsSid,
  }: {
    userId?: number;
    teamId?: number;
    credits: number | null;
    bookingUid: string;
    smsSid: string;
  }) {
    let teamToCharge: number | null = credits === 0 && teamId ? teamId : null;
    let creditType: CreditType = CreditType.ADDITIONAL;
    let remainingCredits;
    if (credits !== 0) {
      const result = await this.getTeamToCharge({
        credits: credits ?? 1, // if we don't have exact credits, we check for at east 1 credit available
        userId,
        teamId,
      });
      teamToCharge = result?.teamId ?? null;
      creditType = result?.creditType ?? creditType;
      remainingCredits = result?.availableCredits;
    }

    if (!teamToCharge) {
      log.error("No team or user found to charge. No credit expense log created");
      return null;
    }

    await this.createExpenseLog({
      bookingUid,
      smsSid,
      teamId: teamToCharge,
      credits,
      creditType,
    });

    if (credits) {
      await this.handleLowCreditBalance({
        teamId: teamToCharge,
        remainingCredits,
      });
    }

    return teamToCharge;
  }

  async hasAvailableCredits({ userId, teamId }: { userId?: number | null; teamId?: number | null }) {
    if (!IS_SMS_CREDITS_ENABLED) return true;
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          credits: {
            select: {
              limitReachedAt: true,
            },
          },
        },
      });

      if (team && !team.credits?.limitReachedAt) {
        return true;
      }
    }

    if (userId) {
      const team = await this.getTeamWithAvailableCredits(userId);
      return !!teamId;
    }

    return false;
  }

  async getTeamWithAvailableCredits(userId: number, credits?: number) {
    const teams = await prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
    });

    //check if user is member of team that has available credits
    for (const team of teams) {
      const teamWithCredits = await prisma.team.findUnique({
        where: {
          id: team.id,
        },
        select: {
          id: true,
          credits: {
            select: {
              limitReachedAt: true,
            },
          },
        },
      });

      if (teamWithCredits && !teamWithCredits.credits?.limitReachedAt) {
        const allCredits = await this.getAllCreditsForTeam(teamWithCredits.id);
        return {
          teamId: teamWithCredits.id,
          availableCredits: allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits,
          creditType:
            allCredits.totalRemainingMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
        };
      }
    }
    return null;
  }

  /*
    credits can be 0, then we just check for available credits
  */
  async getTeamToCharge({
    credits,
    userId,
    teamId,
  }: {
    credits: number;
    userId?: number | null;
    teamId?: number | null;
  }) {
    if (teamId) {
      const teamCredits = await this.getAllCreditsForTeam(teamId);
      const remaningMonthlyCredits =
        teamCredits.totalRemainingMonthlyCredits > 0 ? teamCredits.totalRemainingMonthlyCredits : 0;
      return {
        teamId,
        availableCredits: remaningMonthlyCredits + teamCredits.additionalCredits - credits,
        creditType: remaningMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
      };
    }

    if (userId) {
      const team = await this.getTeamWithAvailableCredits(userId, credits);
      return team;
    }

    return null;
  }

  // done, write test
  private async createExpenseLog(props: {
    bookingUid: string;
    smsSid: string;
    teamId: number;
    credits: number | null;
    creditType: CreditType;
  }) {
    const { credits, creditType, bookingUid, smsSid, teamId } = props;
    let creditBalance: { id: string } | null = null;

    creditBalance = await prisma.creditBalance.findUnique({
      where: {
        teamId: teamId,
      },
    });

    if (!creditBalance) {
      creditBalance = await prisma.creditBalance.create({
        data: {
          teamId: teamId,
        },
      });
    }

    if (credits && creditType === CreditType.ADDITIONAL) {
      await prisma.creditBalance.update({
        where: {
          id: creditBalance.id,
        },
        data: {
          additionalCredits: {
            decrement: credits,
          },
        },
      });
    }

    if (creditBalance) {
      // also track logs with undefined credits (will be set on the cron job)
      await prisma.creditExpenseLog.create({
        data: {
          creditBalanceId: creditBalance.id,
          credits,
          creditType,
          date: new Date(),
          bookingUid,
          smsSid,
        },
      });
    }
  }

  // some more todos + tests
  /*
  Called when we know the exact amount of credits to be charged:
  - Sets `limitReachedAt` and `warningSentAt`
  - Sends warning email if balance is low
  - Sends limit reached email
  - cancels all already scheduled SMS (from the next two hours)
  */
  async handleLowCreditBalance({
    teamId,
    remainingCredits = 0,
  }: {
    teamId: number;
    remainingCredits?: number;
  }) {
    const { totalMonthlyCredits } = await this.getAllCreditsForTeam(teamId);
    const warningLimit = totalMonthlyCredits * 0.2;
    if (remainingCredits < warningLimit) {
      const creditBalance = await prisma.creditBalance.findUnique({
        where: { teamId },
      });

      if (dayjs(creditBalance?.limitReachedAt).isAfter(dayjs().startOf("month"))) return; // team has already reached limit this month

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          name: true,
          members: {
            where: { role: { in: ["ADMIN", "OWNER"] }, accepted: true },
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                  locale: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        log.error("Team not found to send warning email");
        return;
      }

      if (remainingCredits <= 0) {
        await sendCreditBalanceLimitReachedEmails({
          team: {
            id: teamId,
            name: team.name,
            adminAndOwners: await Promise.all(
              team.members.map(async (member) => ({
                name: member.user.name ?? "",
                email: member.user.email,
                t: await getTranslation(member.user.locale ?? "en", "common"),
              }))
            ),
          },
        });

        await prisma.creditBalance.update({
          where: { teamId },
          data: {
            limitReachedAt: new Date(),
            warningSentAt: null,
          },
        });
        cancelScheduledMessagesAndScheduleEmails(teamId);
        return;
      }

      if (dayjs(creditBalance?.warningSentAt).isAfter(dayjs().startOf("month"))) return; // team has already sent warning email this month

      // team balance below 20% of total monthly credits
      await sendCreditBalanceLowWarningEmails({
        balance: remainingCredits,
        team: {
          id: teamId,
          name: team.name,
          adminAndOwners: await Promise.all(
            team.members.map(async (member) => ({
              name: member.user.name ?? "",
              email: member.user.email,
              t: await getTranslation(member.user.locale ?? "en", "common"),
            }))
          ),
        },
      });

      await prisma.creditBalance.update({
        where: { teamId },
        data: {
          warningSentAt: new Date(),
        },
      });
      return;
    }

    await prisma.creditBalance.update({
      where: { teamId },
      data: {
        warningSentAt: null,
        limitReachedAt: null,
      },
    });
  }

  // some more todos + test
  async getMonthlyCredits(teamId: number) {
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        members: {
          select: {
            accepted: true,
          },
        },
        id: true,
        metadata: true,
        parentId: true,
        isOrganization: true,
      },
    });

    if (!team) return 0;

    let totalMonthlyCredits = 0;

    const teamBillingService = new InternalTeamBilling(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    // if (subscriptionStatus !== "active" && subscriptionStatus !== "past_due") {
    //   return 0;
    // }

    const activeMembers = team.members.filter((member) => member.accepted).length;

    const billingService = new StripeBillingService();

    const teamMonthlyPrice = await billingService.getPrice(process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "");
    const pricePerSeat = teamMonthlyPrice.unit_amount ?? 0;
    totalMonthlyCredits = (activeMembers * pricePerSeat) / 2;

    return totalMonthlyCredits;
  }

  calculateCreditsFromPrice(price: number) {
    const twilioPrice = price;
    const priceWithMarkUp = twilioPrice * 1.8;
    const credits = Math.ceil(priceWithMarkUp * 100);
    return credits || null;
  }

  async getAllCreditsForTeam(teamId: number) {
    const creditBalance = await prisma.creditBalance.findUnique({
      where: {
        teamId,
      },
      select: {
        additionalCredits: true,
        expenseLogs: {
          where: {
            date: {
              gte: dayjs().startOf("month").toDate(),
              lte: new Date(),
            },
            creditType: CreditType.MONTHLY,
          },
          select: {
            date: true,
            credits: true,
          },
        },
      },
    });

    const totalMonthlyCredits = await this.getMonthlyCredits(teamId);
    const totalMonthlyCreditsUsed =
      creditBalance?.expenseLogs.reduce((sum, log) => sum + (log?.credits ?? 0), 0) || 0;

    return {
      totalMonthlyCredits,
      totalRemainingMonthlyCredits: totalMonthlyCredits - totalMonthlyCreditsUsed,
      additionalCredits: creditBalance?.additionalCredits ?? 0,
    };
  }
}
