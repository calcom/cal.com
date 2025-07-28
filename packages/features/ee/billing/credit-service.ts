import type { TFunction } from "i18next";

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
import prisma, { type PrismaTransaction } from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["[CreditService]"] });

type LowCreditBalanceResultBase = {
  team?: {
    id: number;
    name: string;
    adminAndOwners: {
      id: number;
      name: string | null;
      email: string;
      t: TFunction;
    }[];
  };
  user?: {
    id: number;
    name: string | null;
    email: string;
    t: TFunction;
  };
};

type LowCreditBalanceLimitReachedResult = LowCreditBalanceResultBase & {
  type: "LIMIT_REACHED";
  teamId?: number | null;
  userId?: number | null;
};

type LowCreditBalanceWarningResult = LowCreditBalanceResultBase & {
  type: "WARNING";
  balance: number;
};

type LowCreditBalanceResult = LowCreditBalanceLimitReachedResult | LowCreditBalanceWarningResult | null;

export class CreditService {
  async chargeCredits({
    userId,
    teamId,
    credits,
    bookingUid,
    smsSid,
    smsSegments,
  }: {
    userId?: number;
    teamId?: number;
    credits: number | null;
    bookingUid?: string;
    smsSid?: string;
    smsSegments?: number;
  }) {
    return await prisma
      .$transaction(async (tx) => {
        let teamIdToCharge = credits === 0 && teamId ? teamId : undefined;
        let creditType: CreditType = CreditType.ADDITIONAL;
        let remainingCredits;
        let userIdToCharge;
        if (!teamIdToCharge) {
          const result = await this._getUserOrTeamToCharge({
            credits: credits ?? 1, // if we don't have exact credits, we check for at east 1 credit available
            userId,
            teamId,
            tx,
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

        await this._createExpenseLog({
          bookingUid,
          smsSid,
          teamId: teamIdToCharge,
          userId: userIdToCharge,
          credits,
          creditType,
          smsSegments,
          tx,
        });

        let lowCreditBalanceResult = null;
        if (credits) {
          lowCreditBalanceResult = await this._handleLowCreditBalance({
            teamId: teamIdToCharge,
            userId: userIdToCharge,
            remainingCredits: remainingCredits ?? 0,
            tx,
          });
        }

        return {
          teamId: teamIdToCharge,
          userId: userIdToCharge,
          lowCreditBalanceResult,
        };
      })
      .then(async (result) => {
        if (result?.lowCreditBalanceResult) {
          // send emails after transaction is successfully committed
          await this._handleLowCreditBalanceResult(result.lowCreditBalanceResult);
        }
        return {
          teamId: result?.teamId,
          userId: result?.userId,
        };
      });
  }

  /*
    also returns true if team has no available credits but limitReachedAt is not yet set
  */
  async hasAvailableCredits({ userId, teamId }: { userId?: number | null; teamId?: number | null }) {
    return await prisma.$transaction(async (tx) => {
      if (!IS_SMS_CREDITS_ENABLED) return true;

      if (teamId) {
        const creditBalance = await CreditsRepository.findCreditBalance({ teamId }, tx);

        const limitReached =
          creditBalance?.limitReachedAt &&
          dayjs(creditBalance.limitReachedAt).isAfter(dayjs().startOf("month"));

        if (!limitReached) return true;

        // check if team is still out of credits
        const teamCredits = await this._getAllCreditsForTeam({ teamId, tx });
        const availableCredits = teamCredits.totalRemainingMonthlyCredits + teamCredits.additionalCredits;

        if (availableCredits > 0) {
          await CreditsRepository.updateCreditBalance(
            {
              teamId,
              data: {
                limitReachedAt: null,
                warningSentAt: null,
              },
            },
            tx
          );
          return true;
        }
        // limtReachedAt is set and still no available credits
        return false;
      }

      if (userId) {
        const teamWithAvailableCredits = await this._getTeamWithAvailableCredits({ userId, tx });

        if (teamWithAvailableCredits && !teamWithAvailableCredits.limitReached) return true;

        const userCredits = await this._getAllCredits({ userId, tx });

        return userCredits.additionalCredits > 0;
      }

      return false;
    });
  }

  async getTeamWithAvailableCredits(userId: number) {
    return prisma.$transaction(async (tx) => {
      return this._getTeamWithAvailableCredits({ userId, tx });
    });
  }

  /*
    If user has memberships, it always returns a team, even if all have limit reached. In that case, limitReached: true is returned
  */
  protected async _getTeamWithAvailableCredits({ userId, tx }: { userId: number; tx: PrismaTransaction }) {
    const memberships = await MembershipRepository.findAllAcceptedPublishedTeamMemberships(userId, tx);

    if (!memberships || memberships.length === 0) {
      return null;
    }

    //check if user is member of team that has available credits
    for (const membership of memberships) {
      const creditBalance = await CreditsRepository.findCreditBalance({ teamId: membership.teamId }, tx);

      const allCredits = await this._getAllCreditsForTeam({ teamId: membership.teamId, tx });
      const limitReached =
        creditBalance?.limitReachedAt &&
        dayjs(creditBalance.limitReachedAt).isAfter(dayjs().startOf("month"));

      const availableCredits = allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits;

      if (!limitReached || availableCredits > 0) {
        if (limitReached) {
          await CreditsRepository.updateCreditBalance(
            {
              teamId: membership.teamId,
              data: {
                limitReachedAt: null,
                warningSentAt: null,
              },
            },
            tx
          );
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
      limitReached: true,
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
    return prisma.$transaction(async (tx) => {
      return this._getUserOrTeamToCharge({ credits, userId, teamId, tx });
    });
  }

  protected async _getUserOrTeamToCharge({
    credits,
    userId,
    teamId,
    tx,
  }: {
    credits: number;
    userId?: number | null;
    teamId?: number | null;
    tx: PrismaTransaction;
  }) {
    if (teamId) {
      const teamCredits = await this._getAllCreditsForTeam({ teamId, tx });
      const remaningMonthlyCredits =
        teamCredits.totalRemainingMonthlyCredits > 0 ? teamCredits.totalRemainingMonthlyCredits : 0;
      return {
        teamId,
        remainingCredits: remaningMonthlyCredits + teamCredits.additionalCredits - credits,
        creditType: remaningMonthlyCredits > 0 ? CreditType.MONTHLY : CreditType.ADDITIONAL,
      };
    }

    if (userId) {
      const team = await this._getTeamWithAvailableCredits({ userId, tx });
      if (team) {
        return { ...team, remainingCredits: team.availableCredits - credits };
      }

      const userCredits = await this._getAllCredits({ userId, tx });

      return {
        userId,
        remainingCredits: userCredits.additionalCredits - credits,
        creditType: CreditType.ADDITIONAL,
      };
    }
    return null;
  }

  protected async _createExpenseLog(props: {
    bookingUid?: string;
    smsSid?: string;
    teamId?: number;
    userId?: number;
    credits: number | null;
    creditType: CreditType;
    smsSegments?: number;
    tx: PrismaTransaction;
  }) {
    const { credits, creditType, bookingUid, smsSid, teamId, userId, smsSegments, tx } = props;
    let creditBalance: { id: string; additionalCredits: number } | null | undefined =
      await CreditsRepository.findCreditBalance({ teamId, userId }, tx);

    if (!creditBalance) {
      creditBalance = await CreditsRepository.createCreditBalance(
        {
          teamId,
          userId,
        },
        tx
      );
    }

    if (credits && creditType === CreditType.ADDITIONAL) {
      const decrementValue =
        credits <= creditBalance.additionalCredits ? credits : creditBalance.additionalCredits;
      await CreditsRepository.updateCreditBalance(
        {
          id: creditBalance.id,
          data: {
            additionalCredits: {
              decrement: decrementValue,
            },
          },
        },
        tx
      );
    }

    if (creditBalance) {
      // also track logs with undefined credits (will be set on the cron job)
      await CreditsRepository.createCreditExpenseLog(
        {
          creditBalanceId: creditBalance.id,
          credits,
          creditType,
          date: new Date(),
          bookingUid,
          smsSid,
          smsSegments,
        },
        tx
      );
    }
  }

  /*
  Called when we know the exact amount of credits to be charged:
  - Sets `limitReachedAt` and `warningSentAt`
  - Sends warning email if balance is low
  - Sends limit reached email
  - cancels all already scheduled SMS (from the next two hours)
  */
  protected async _handleLowCreditBalance({
    teamId,
    userId,
    remainingCredits,
    tx,
  }: {
    teamId?: number | null;
    userId?: number | null;
    remainingCredits: number;
    tx: PrismaTransaction;
  }): Promise<LowCreditBalanceResult> {
    let warningLimit = 0;
    if (teamId) {
      const { totalMonthlyCredits } = await this._getAllCreditsForTeam({ teamId, tx });
      warningLimit = totalMonthlyCredits * 0.2;
    } else if (userId) {
      const billingService = new StripeBillingService();
      const teamMonthlyPrice = await billingService.getPrice(process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "");
      const pricePerSeat = teamMonthlyPrice.unit_amount ?? 0;
      warningLimit = (pricePerSeat / 2) * 0.2;
    }

    if (remainingCredits < warningLimit) {
      const creditBalance = await CreditsRepository.findCreditBalanceWithTeamOrUser({ teamId, userId }, tx);

      if (
        creditBalance?.limitReachedAt &&
        (!teamId || dayjs(creditBalance?.limitReachedAt).isAfter(dayjs().startOf("month")))
      ) {
        return null; // user has limit already reached or team has already reached limit this month
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
        return null;
      }

      if (remainingCredits <= 0) {
        await CreditsRepository.updateCreditBalance(
          {
            teamId,
            userId,
            data: {
              limitReachedAt: new Date(),
              warningSentAt: null,
            },
          },
          tx
        );

        return {
          type: "LIMIT_REACHED" as const,
          team: teamWithAdmins,
          user,
          teamId,
          userId,
        };
      }

      if (
        creditBalance?.warningSentAt &&
        (!teamId || dayjs(creditBalance?.warningSentAt).isAfter(dayjs().startOf("month")))
      ) {
        return null; // user has already received a warning or team has already sent warning email this month
      }

      await CreditsRepository.updateCreditBalance(
        {
          teamId,
          userId,
          data: {
            warningSentAt: new Date(),
          },
        },
        tx
      );

      return {
        type: "WARNING" as const,
        balance: remainingCredits,
        team: teamWithAdmins,
        user,
      };
    }

    await CreditsRepository.updateCreditBalance(
      {
        teamId,
        userId,
        data: {
          warningSentAt: null,
          limitReachedAt: null,
        },
      },
      tx
    );

    return null;
  }

  private async _handleLowCreditBalanceResult(result: LowCreditBalanceResult) {
    if (!result) return;

    try {
      if (result.type === "LIMIT_REACHED") {
        await Promise.all([
          sendCreditBalanceLimitReachedEmails({
            team: result.team,
            user: result.user,
          }).catch((error) => {
            log.error("Failed to send credit limit reached email", error, { result });
          }),
          cancelScheduledMessagesAndScheduleEmails({ teamId: result.teamId, userId: result.userId }).catch(
            (error) => {
              log.error("Failed to cancel scheduled messages", error, { result });
            }
          ),
        ]);
      } else if (result.type === "WARNING") {
        await sendCreditBalanceLowWarningEmails({
          balance: result.balance,
          team: result.team,
          user: result.user,
        }).catch((error) => {
          log.error("Failed to send credit warning email", error, { result });
        });
      }
    } catch (error) {
      // Catch any other unexpected errors
      log.error("Unexpected error handling low credit balance result", error, { result });
    }
  }

  async handleLowCreditBalance({
    teamId,
    userId,
    remainingCredits,
  }: {
    teamId?: number | null;
    userId?: number | null;
    remainingCredits: number;
  }) {
    return prisma
      .$transaction(async (tx) => {
        const result = await this._handleLowCreditBalance({ teamId, userId, remainingCredits, tx });
        return result;
      })
      .then(async (result) => {
        await this._handleLowCreditBalanceResult(result);
      });
  }

  async getMonthlyCredits(teamId: number) {
    const teamRepo = new TeamRepository(prisma);
    const team = await teamRepo.findTeamWithMembers(teamId);

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
    return prisma.$transaction(async (tx) => {
      return this._getAllCredits({ userId, teamId, tx });
    });
  }

  protected async _getAllCredits({
    userId,
    teamId,
    tx,
  }: {
    userId?: number | null;
    teamId?: number | null;
    tx: PrismaTransaction;
  }) {
    if (teamId) {
      return this._getAllCreditsForTeam({ teamId, tx });
    }

    if (userId) {
      const creditBalance = await CreditsRepository.findCreditBalance({ userId }, tx);

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
    return prisma.$transaction(async (tx) => {
      return this._getAllCreditsForTeam({ teamId, tx });
    });
  }

  protected async _getAllCreditsForTeam({ teamId, tx }: { teamId: number; tx: PrismaTransaction }) {
    const creditBalance = await CreditsRepository.findCreditBalanceWithExpenseLogs(
      { teamId, creditType: CreditType.MONTHLY },
      tx
    );

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
