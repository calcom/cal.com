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
    let teamToCharge = credits === 0 && teamId ? teamId : null;
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
      remainingCredits = result?.remainingCredits;
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
      const team = await this.getTeamWithAvailableCredits(userId);
      return team.availableCredits > 0;
    }

    return false;
  }

  async getTeamWithAvailableCredits(userId: number) {
    const memberships = await MembershipRepository.findAllAcceptedMemberships(userId);

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
        remainingCredits: remaningMonthlyCredits + teamCredits.additionalCredits - credits,
        creditType: remaningMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
      };
    }

    if (userId) {
      const team = await this.getTeamWithAvailableCredits(userId);
      return { ...team, remainingCredits: team.availableCredits - credits };
    }
    return null;
  }

  private async createExpenseLog(props: {
    bookingUid?: string;
    smsSid?: string;
    teamId: number;
    credits: number | null;
    creditType: CreditType;
  }) {
    const { credits, creditType, bookingUid, smsSid, teamId } = props;
    let creditBalance: { id: string; additionalCredits: number } | null =
      await CreditsRepository.findCreditBalance({ teamId });

    if (!creditBalance) {
      creditBalance = await CreditsRepository.createCreditBalance({
        teamId,
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
    remainingCredits = 0,
  }: {
    teamId: number;
    remainingCredits?: number;
  }) {
    const { totalMonthlyCredits } = await this.getAllCreditsForTeam(teamId);
    const warningLimit = totalMonthlyCredits * 0.2;
    if (remainingCredits < warningLimit) {
      const creditBalance = await CreditsRepository.findCreditBalance({ teamId });

      if (
        creditBalance?.limitReachedAt &&
        dayjs(creditBalance?.limitReachedAt).isAfter(dayjs().startOf("month"))
      ) {
        return; // team has already reached limit this month
      }

      const team = await TeamRepository.findTeamWithAdmins(teamId);

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

        await CreditsRepository.updateCreditBalance({
          teamId,
          data: {
            limitReachedAt: new Date(),
            warningSentAt: null,
          },
        });
        await cancelScheduledMessagesAndScheduleEmails(teamId);
        return;
      }
      if (
        creditBalance?.warningSentAt &&
        dayjs(creditBalance?.warningSentAt).isAfter(dayjs().startOf("month"))
      ) {
        return; // team has already sent warning email this month
      }

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

      await CreditsRepository.updateCreditBalance({
        teamId,
        data: {
          warningSentAt: new Date(),
        },
      });
      return;
    }

    await CreditsRepository.updateCreditBalance({
      teamId,
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
