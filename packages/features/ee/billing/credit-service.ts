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
import { getTranslation } from "@calcom/lib/server/i18n";
import { CreditsRepository } from "@calcom/lib/server/repository/credits";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { TeamRepository } from "@calcom/lib/server/repository/team";
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
    bookingUid?: string;
    smsSid?: string;
  }) {
    let teamIdToCharge = credits === 0 && teamId ? teamId : undefined;
    let creditType: CreditType = CreditType.ADDITIONAL;
    let remainingCredits;
    let userIdToCharge;
    if (!teamIdToCharge) {
      const result = await this.getUserOrTeamToCharge({
        credits: credits ?? 1, // if we don't have exact credits, we check for at east 1 credit available
        userId,
        teamId,
      });
      teamIdToCharge = result?.teamId;
      userIdToCharge = result?.userId;
      creditType = result?.creditType ?? creditType;
      remainingCredits = result?.remainingCredits;
    }

    if (!teamIdToCharge && !userIdToCharge) {
      log.error("No team or user found to charge. No credit expense log created");
      return null;
    }

    await this.createExpenseLog({
      bookingUid,
      smsSid,
      teamId: teamIdToCharge,
      userId: userIdToCharge,
      credits,
      creditType,
    });

    if (credits) {
      await this.handleLowCreditBalance({
        teamId: teamIdToCharge,
        userId: userIdToCharge,
        remainingCredits: remainingCredits ?? 0,
      });
    }

    return { teamId: teamIdToCharge, userId: userIdToCharge };
  }

  async hasAvailableCredits({ userId, teamId }: { userId?: number | null; teamId?: number | null }) {
    if (!IS_SMS_CREDITS_ENABLED) return true;

    if (teamId) {
      const creditBalance = await CreditsRepository.findCreditBalance({ teamId });

      const limitReached =
        creditBalance?.limitReachedAt &&
        dayjs(creditBalance.limitReachedAt).isAfter(dayjs().startOf("month"));

      if (!limitReached) return true;

      // check if team is still out of credits
      const teamCredits = await this.getAllCreditsForTeam(teamId);
      const availableCredits = teamCredits.totalRemainingMonthlyCredits + teamCredits.additionalCredits;

      if (availableCredits > 0) {
        await CreditsRepository.updateCreditBalance({
          teamId,
          data: {
            limitReachedAt: null,
            warningSentAt: null,
          },
        });
        return true;
      }
    }

    if (userId) {
      const teamWithAvailableCredits = await this.getTeamWithAvailableCredits(userId);

      if (teamWithAvailableCredits && teamWithAvailableCredits?.availableCredits > 0) return true;

      const userCredits = await this.getAllCredits({ userId });

      return userCredits.additionalCredits > 0;
    }

    return false;
  }

  async getTeamWithAvailableCredits(userId: number) {
    const memberships = await MembershipRepository.findAllAcceptedMemberships(userId);

    if (memberships.length === 0) {
      return null;
    }

    //check if user is member of team that has available credits
    for (const membership of memberships) {
      const creditBalance = await CreditsRepository.findCreditBalance({ teamId: membership.teamId });

      const allCredits = await this.getAllCreditsForTeam(membership.teamId);
      const limitReached =
        creditBalance?.limitReachedAt &&
        dayjs(creditBalance.limitReachedAt).isAfter(dayjs().startOf("month"));

      const availableCredits = allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits;

      if (!limitReached || availableCredits > 0) {
        if (limitReached) {
          await CreditsRepository.updateCreditBalance({
            teamId: membership.teamId,
            data: {
              limitReachedAt: null,
              warningSentAt: null,
            },
          });
        }
        return {
          teamId: membership.teamId,
          availableCredits,
          creditType:
            allCredits.totalRemainingMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
        };
      }
    }

    return {
      teamId: memberships[0].teamId,
      availableCredits: 0,
      creditType: CreditType.ADDITIONAL,
    };
  }

  /*
    always returns a team, even if all teams are out of credits
  */
  async getUserOrTeamToCharge({
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
        remainingCredits: remaningMonthlyCredits + teamCredits.additionalCredits - credits,
        creditType: remaningMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
      };
    }

    if (userId) {
      const team = await this.getTeamWithAvailableCredits(userId);
      if (team) {
        return { ...team, remainingCredits: team.availableCredits - credits };
      }

      const userCredits = await this.getAllCredits({ userId });

      return {
        userId,
        remainingCredits: userCredits.additionalCredits - credits,
        creditType: CreditType.ADDITIONAL,
      };
    }
    return null;
  }

  private async createExpenseLog(props: {
    bookingUid?: string;
    smsSid?: string;
    teamId?: number;
    userId?: number;
    credits: number | null;
    creditType: CreditType;
  }) {
    const { credits, creditType, bookingUid, smsSid, teamId, userId } = props;
    let creditBalance: { id: string; additionalCredits: number } | null | undefined =
      await CreditsRepository.findCreditBalance({ teamId, userId });

    if (!creditBalance) {
      creditBalance = await CreditsRepository.createCreditBalance({
        teamId,
        userId,
      });
    }

    if (credits && creditType === CreditType.ADDITIONAL) {
      const decrementValue =
        credits <= creditBalance.additionalCredits ? credits : creditBalance.additionalCredits;
      await CreditsRepository.updateCreditBalance({
        id: creditBalance.id,
        data: {
          additionalCredits: {
            decrement: decrementValue,
          },
        },
      });
    }

    if (creditBalance) {
      // also track logs with undefined credits (will be set on the cron job)
      await CreditsRepository.createCreditExpenseLog({
        creditBalanceId: creditBalance.id,
        credits,
        creditType,
        date: new Date(),
        bookingUid,
        smsSid,
      });
    }
  }

  /*
  Called when we know the exact amount of credits to be charged:
  - Sets `limitReachedAt` and `warningSentAt`
  - Sends warning email if balance is low
  - Sends limit reached email
  - cancels all already scheduled SMS (from the next two hours)
  */
  async handleLowCreditBalance({
    teamId,
    userId,
    remainingCredits,
  }: {
    teamId?: number | null;
    userId?: number | null;
    remainingCredits: number;
  }) {
    let warningLimit = 0;
    if (teamId) {
      const { totalMonthlyCredits } = await this.getAllCreditsForTeam(teamId);
      warningLimit = totalMonthlyCredits * 0.2;
    } else if (userId) {
      const billingService = new StripeBillingService();
      const teamMonthlyPrice = await billingService.getPrice(process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "");
      const pricePerSeat = teamMonthlyPrice.unit_amount ?? 0;
      warningLimit = (pricePerSeat / 2) * 0.2;
    }

    if (remainingCredits < warningLimit) {
      const creditBalance = await CreditsRepository.findCreditBalanceWithTeamOrUser({ teamId, userId });

      if (
        creditBalance?.limitReachedAt &&
        (!teamId || dayjs(creditBalance?.limitReachedAt).isAfter(dayjs().startOf("month")))
      ) {
        return; // user has limit already reached or team has already reached limit this month
      }

      const teamWithAdmins = creditBalance?.team
        ? {
            ...creditBalance.team,
            adminAndOwners: await Promise.all(
              creditBalance.team.members.map(async (member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                t: await getTranslation(member.user.locale ?? "en", "common"),
              }))
            ),
          }
        : undefined;

      const user = creditBalance?.user
        ? {
            ...creditBalance.user,
            t: await getTranslation(creditBalance.user.locale ?? "en", "common"),
          }
        : undefined;

      if ((!teamWithAdmins || !teamWithAdmins.adminAndOwners?.length) && !user) {
        log.error("Team or user not found to send warning email");
        return;
      }

      if (remainingCredits <= 0) {
        await sendCreditBalanceLimitReachedEmails({
          team: teamWithAdmins,
          user,
        });

        await CreditsRepository.updateCreditBalance({
          teamId,
          userId,
          data: {
            limitReachedAt: new Date(),
            warningSentAt: null,
          },
        });

        await cancelScheduledMessagesAndScheduleEmails({ teamId, userId });
        return;
      }
      if (
        creditBalance?.warningSentAt &&
        (!teamId || dayjs(creditBalance?.warningSentAt).isAfter(dayjs().startOf("month")))
      ) {
        return; // user has already received a warning or team has already sent warning email this month
      }

      await sendCreditBalanceLowWarningEmails({
        balance: remainingCredits,
        team: teamWithAdmins,
        user,
      });

      await CreditsRepository.updateCreditBalance({
        teamId,
        userId,
        data: {
          warningSentAt: new Date(),
        },
      });
      return;
    }

    await CreditsRepository.updateCreditBalance({
      teamId,
      userId,
      data: {
        warningSentAt: null,
        limitReachedAt: null,
      },
    });
  }

  async getMonthlyCredits(teamId: number) {
    const team = await TeamRepository.findTeamWithMembers(teamId);

    if (!team) return 0;

    let totalMonthlyCredits = 0;

    const teamBillingService = new InternalTeamBilling(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (subscriptionStatus !== "active" && subscriptionStatus !== "past_due") {
      return 0;
    }

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

  async getAllCredits({ userId, teamId }: { userId?: number | null; teamId?: number | null }) {
    if (teamId) {
      return this.getAllCreditsForTeam(teamId);
    }

    if (userId) {
      const creditBalance = await CreditsRepository.findCreditBalance({ userId });

      return {
        totalMonthlyCredits: 0,
        totalRemainingMonthlyCredits: 0,
        additionalCredits: creditBalance?.additionalCredits ?? 0,
      };
    }

    return {
      totalMonthlyCredits: 0,
      totalRemainingMonthlyCredits: 0,
      additionalCredits: 0,
    };
  }

  async getAllCreditsForTeam(teamId: number) {
    const creditBalance = await CreditsRepository.findCreditBalanceWithExpenseLogs({ teamId });

    const totalMonthlyCredits = await this.getMonthlyCredits(teamId);
    const totalMonthlyCreditsUsed =
      creditBalance?.expenseLogs.reduce((sum, log) => sum + (log?.credits ?? 0), 0) || 0;

    return {
      totalMonthlyCredits,
      totalRemainingMonthlyCredits: Math.max(totalMonthlyCredits - totalMonthlyCreditsUsed, 0),
      additionalCredits: creditBalance?.additionalCredits ?? 0,
    };
  }
}
