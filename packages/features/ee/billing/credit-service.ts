import type { TFunction } from "i18next";

import dayjs from "@calcom/dayjs";
import { CreditsRepository } from "@calcom/features/credits/repositories/CreditsRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import logger from "@calcom/lib/logger";
import { prisma, type PrismaTransaction } from "@calcom/prisma";
import { CreditUsageType, CreditType } from "@calcom/prisma/enums";

import { getBillingProviderService, getTeamBillingServiceFactory } from "./di/containers/Billing";
import { SubscriptionStatus } from "./repository/billing/IBillingRepository";

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
  creditFor?: CreditUsageType;
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

export type CreditCheckFn = CreditService["hasAvailableCredits"];

export class CreditService {
  async chargeCredits({
    userId,
    teamId,
    credits,
    bookingUid,
    smsSid,
    smsSegments,
    phoneNumber,
    email,
    callDuration,
    creditFor,
    externalRef,
  }: {
    userId?: number;
    teamId?: number;
    credits: number | null;
    bookingUid?: string;
    smsSid?: string;
    smsSegments?: number;
    phoneNumber?: string;
    email?: string;
    callDuration?: number;
    creditFor?: CreditUsageType;
    externalRef?: string;
  }) {
    if (externalRef) {
      const existingLog = await CreditsRepository.findCreditExpenseLogByExternalRef(externalRef);
      if (existingLog) {
        log.warn("Credit expense log already exists", { externalRef, existingLog });
        return {
          bookingUid: existingLog.bookingUid,
          duplicate: true,
          userId,
          teamId,
        };
      }
    }
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
          phoneNumber,
          email,
          callDuration,
          creditFor,
          tx,
          externalRef,
        });

        let lowCreditBalanceResult = null;
        if (credits) {
          lowCreditBalanceResult = await this._handleLowCreditBalance({
            teamId: teamIdToCharge,
            userId: userIdToCharge,
            remainingCredits: remainingCredits ?? 0,
            creditFor,
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
  async hasAvailableCredits({
    userId,
    teamId,
  }: {
    userId?: number | null;
    teamId?: number | null;
  }): Promise<boolean> {
    return await prisma.$transaction(async (tx) => {
      if (!IS_SMS_CREDITS_ENABLED) return true;

      if (teamId) {
        // Check if this team belongs to an organization or is itself an organization
        const orgId = await getOrgIdFromMemberOrTeamId({ teamId }, tx);

        // Use organization credits if team belongs to org, otherwise use team's own credits
        const teamIdToCheck = orgId ?? teamId;

        const creditBalance = await CreditsRepository.findCreditBalance({ teamId: teamIdToCheck }, tx);

        const limitReached =
          creditBalance?.limitReachedAt &&
          dayjs(creditBalance.limitReachedAt).isAfter(dayjs().startOf("month"));

        if (!limitReached) return true;

        // check if team is still out of credits
        const teamCredits = await this._getAllCreditsForTeam({ teamId: teamIdToCheck, tx });
        const availableCredits = teamCredits.totalRemainingMonthlyCredits + teamCredits.additionalCredits;

        if (availableCredits > 0) {
          await CreditsRepository.updateCreditBalance(
            {
              teamId: teamIdToCheck,
              data: {
                limitReachedAt: null,
                warningSentAt: null,
              },
            },
            tx
          );
          return true;
        }
        // limitReachedAt is set and still no available credits
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

  /**
   * Separates memberships into organization and team memberships.
   * Organizations take precedence - if user belongs to any organization,
   * only organization memberships are returned.
   *
   * @param memberships - User's accepted team memberships
   * @param teams - Team data including isOrganization and parentId
   * @returns Memberships to check (org memberships if any exist, otherwise team memberships)
   */
  private static filterMembershipsForCreditCheck<T extends { teamId: number }>(
    memberships: T[],
    teams: Array<{ id: number; isOrganization: boolean; parentId: number | null }>
  ): T[] {
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    const orgMemberships: T[] = [];
    const teamMemberships: T[] = [];

    for (const membership of memberships) {
      const team = teamMap.get(membership.teamId);
      if (team?.isOrganization && !team.parentId) {
        orgMemberships.push(membership);
      } else {
        teamMemberships.push(membership);
      }
    }

    // If user belongs to any organization, ONLY check organization credits
    return orgMemberships.length > 0 ? orgMemberships : teamMemberships;
  }

  /*
    If user has memberships, it always returns a team, even if all have limit reached. In that case, limitReached: true is returned
    If user belongs to any organization, ONLY organization credits are checked (team memberships are ignored)
    If user does not belong to an organization, team credits are checked
  */
  protected async _getTeamWithAvailableCredits({ userId, tx }: { userId: number; tx: PrismaTransaction }) {
    const memberships = await MembershipRepository.findAllAcceptedPublishedTeamMemberships(userId, tx);

    if (!memberships || memberships.length === 0) {
      return null;
    }

    const teamRepository = new TeamRepository(prisma);
    const teams = await teamRepository.findTeamsForCreditCheck({
      teamIds: memberships.map((m) => m.teamId),
    });

    const membershipsToCheck = CreditService.filterMembershipsForCreditCheck(memberships, teams);

    for (const membership of membershipsToCheck) {
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
      teamId: membershipsToCheck[0].teamId,
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
    phoneNumber?: string;
    email?: string;
    callDuration?: number;
    creditFor?: CreditUsageType;
    tx: PrismaTransaction;
    externalRef?: string;
  }) {
    const {
      credits,
      creditType,
      bookingUid,
      smsSid,
      teamId,
      userId,
      smsSegments,
      callDuration,
      creditFor,
      phoneNumber,
      email,
      tx,
    } = props;
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
          creditFor,
          date: new Date(),
          bookingUid,
          smsSid,
          smsSegments,
          phoneNumber,
          email,
          callDuration,
          externalRef: props.externalRef,
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
    creditFor,
    tx,
  }: {
    teamId?: number | null;
    userId?: number | null;
    remainingCredits: number;
    creditFor?: CreditUsageType;
    tx: PrismaTransaction;
  }): Promise<LowCreditBalanceResult> {
    let warningLimit = 0;
    if (teamId) {
      const { totalMonthlyCredits } = await this._getAllCreditsForTeam({ teamId, tx });
      warningLimit = totalMonthlyCredits * 0.2;
    } else if (userId) {
      const billingService = getBillingProviderService();
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
        log.info("User or team has limit already reached this month", {
          teamId,
          userId,
          creditBalance,
        });
        return null; // user has limit already reached or team has already reached limit this month
      }

      const { getTranslation } = await import("@calcom/lib/server/i18n");

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
          creditFor,
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
        creditFor,
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
        const { sendCreditBalanceLimitReachedEmails } = await import("@calcom/emails/billing-email-service");

        const promises: Promise<unknown>[] = [
          sendCreditBalanceLimitReachedEmails({
            team: result.team,
            user: result.user,
            creditFor: result.creditFor,
          }).catch((error) => {
            log.error("Failed to send credit limit reached email", error, { result });
          }),
        ];

        if (!result.creditFor || result.creditFor === CreditUsageType.SMS) {
          const { cancelScheduledMessagesAndScheduleEmails } = await import(
            "@calcom/features/ee/workflows/lib/reminders/reminderScheduler"
          );
          promises.push(
            cancelScheduledMessagesAndScheduleEmails({
              teamId: result.teamId,
              userIdsWithNoCredits: await this._getUserIdsWithoutCredits({
                teamId: result.teamId ?? null,
                userId: result.userId ?? null,
              }),
            }).catch((error) => {
              log.error("Failed to cancel scheduled messages", error, { result });
            })
          );
        }

        await Promise.all(promises);
      } else if (result.type === "WARNING") {
        const { sendCreditBalanceLowWarningEmails } = await import("@calcom/emails/billing-email-service");
        await sendCreditBalanceLowWarningEmails({
          balance: result.balance,
          team: result.team,
          user: result.user,
          creditFor: result.creditFor,
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

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);
    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (
      subscriptionStatus !== SubscriptionStatus.ACTIVE &&
      subscriptionStatus !== SubscriptionStatus.PAST_DUE
    ) {
      return 0;
    }

    const activeMembers = team.members.filter((member) => member.accepted).length;

    if (team.isOrganization) {
      const orgMonthlyCredits = process.env.ORG_MONTHLY_CREDITS;
      const creditsPerSeat = orgMonthlyCredits ? parseInt(orgMonthlyCredits) : 1000;
      return activeMembers * creditsPerSeat;
    }

    const billingService = getBillingProviderService();
    const priceId = process.env.STRIPE_TEAM_MONTHLY_PRICE_ID;

    if (!priceId) {
      log.warn("Monthly price ID not configured", { teamId });
      return 0;
    }

    const monthlyPrice = await billingService.getPrice(priceId);
    if (!monthlyPrice) {
      log.warn("Failed to retrieve monthly price", { teamId, priceId });
      return 0;
    }
    const pricePerSeat = monthlyPrice.unit_amount ?? 0;
    const creditsPerSeat = pricePerSeat * 0.5;

    return activeMembers * creditsPerSeat;
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
        totalCreditsUsedThisMonth: 0,
      };
    }

    return {
      totalMonthlyCredits: 0,
      totalRemainingMonthlyCredits: 0,
      additionalCredits: 0,
      totalCreditsUsedThisMonth: 0,
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

    const additionalCredits = creditBalance?.additionalCredits ?? 0;
    const totalCreditsUsedThisMonth = totalMonthlyCreditsUsed;

    return {
      totalMonthlyCredits,
      totalRemainingMonthlyCredits: Math.max(totalMonthlyCredits - totalMonthlyCreditsUsed, 0),
      additionalCredits,
      totalCreditsUsedThisMonth,
    };
  }

  async moveCreditsFromTeamToOrg({ teamId, orgId }: { teamId: number; orgId: number }) {
    return await prisma.$transaction(async (tx) => {
      // Get team's credit balance
      const teamCreditBalance = await CreditsRepository.findCreditBalance({ teamId }, tx);

      if (!teamCreditBalance || teamCreditBalance.additionalCredits <= 0) {
        log.info("No credits to transfer from team to org", { teamId, orgId });
        return;
      }

      // Get or create org's credit balance
      let orgCreditBalance = await CreditsRepository.findCreditBalance({ teamId: orgId }, tx);

      if (!orgCreditBalance) {
        orgCreditBalance = await CreditsRepository.createCreditBalance(
          {
            teamId: orgId,
          },
          tx
        );
      }

      const creditsToTransfer = teamCreditBalance.additionalCredits;

      // Transfer credits from team to org
      await CreditsRepository.updateCreditBalance(
        {
          teamId,
          data: {
            additionalCredits: 0,
          },
        },
        tx
      );

      await CreditsRepository.updateCreditBalance(
        {
          teamId: orgId,
          data: {
            additionalCredits: {
              increment: creditsToTransfer,
            },
          },
        },
        tx
      );

      log.info("Successfully transferred credits from team to org", {
        teamId,
        orgId,
        creditsTransferred: creditsToTransfer,
      });

      return {
        creditsTransferred: creditsToTransfer,
        teamId,
        orgId,
      };
    });
  }

  private async _getUserIdsWithoutCredits({
    teamId,
    userId,
  }: {
    teamId: number | null;
    userId: number | null;
  }) {
    let userIdsWithNoCredits: number[] = userId ? [userId] : [];
    if (teamId) {
      const teamMembers = await prisma.membership.findMany({
        where: {
          teamId,
          accepted: true,
        },
      });

      userIdsWithNoCredits = (
        await Promise.all(
          teamMembers.map(async (member) => {
            const hasCredits = await this.hasAvailableCredits({ userId: member.userId });
            return { userId: member.userId, hasCredits };
          })
        )
      )
        .filter(({ hasCredits }) => !hasCredits)
        .map(({ userId }) => userId);
    }
    return userIdsWithNoCredits;
  }
}
