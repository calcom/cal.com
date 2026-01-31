import type { IBillingProviderService } from "@calcom/features/ee/billing/service/billingProvider/IBillingProviderService";
import type { ManagedUsersBillingRepository } from "@calcom/features/ee/organizations/repositories/ManagedUsersBillingRepository";
import type { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import type { PlatformBillingRepository } from "@calcom/features/ee/organizations/repositories/PlatformBillingRepository";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { PlatformOrganizationBillingTasks } from "./types";

export interface IPlatformOrganizationBillingTaskServiceDependencies {
  organizationRepository: OrganizationRepository;
  platformBillingRepository: PlatformBillingRepository;
  managedUsersBillingRepository: ManagedUsersBillingRepository;
  billingProviderService: Pick<
    IBillingProviderService,
    | "createSubscriptionUsageRecord"
    | "createCustomer"
    | "createInvoiceItem"
    | "createInvoice"
    | "finalizeInvoice"
  >;
}

export class PlatformOrganizationBillingTaskService implements PlatformOrganizationBillingTasks {
  constructor(
    public readonly dependencies: {
      logger: ITaskerDependencies["logger"];
    } & IPlatformOrganizationBillingTaskServiceDependencies
  ) {}

  async incrementUsage(
    payload: Parameters<PlatformOrganizationBillingTasks["incrementUsage"]>[0]
  ): Promise<void> {
    const { userId } = payload;
    const { organizationRepository, platformBillingRepository, billingProviderService, logger } =
      this.dependencies;

    const team = await organizationRepository.findPlatformOrgByUserId(userId);
    const teamId = team?.id;
    if (!teamId) {
      logger.error(`User (${userId}) is not part of the platform organization (${teamId})`, {
        teamId,
        userId,
      });
      return;
    }

    const billingSubscription = await platformBillingRepository.findByTeamId(teamId);
    if (!billingSubscription || !billingSubscription?.subscriptionId) {
      logger.error(`Team ${teamId} did not have stripe subscription associated to it`, {
        teamId,
      });
      return;
    }

    await billingProviderService.createSubscriptionUsageRecord({
      subscriptionId: billingSubscription.subscriptionId,
      action: "increment",
      quantity: 1,
    });

    logger.info("Increased organization usage for subscription", {
      subscriptionId: billingSubscription.subscriptionId,
      teamId,
      userId,
    });
  }

  async countActiveManagedUsers(
    payload: Parameters<PlatformOrganizationBillingTasks["countActiveManagedUsers"]>[0]
  ): Promise<void> {
    const { organizationId, periodStart, periodEnd } = payload;
    const { logger } = this.dependencies;

    const activeCount = await this.getActiveManagedUsersCount(organizationId, periodStart, periodEnd);

    logger.info("Counted active managed users for organization", {
      organizationId,
      periodStart: new Date(periodStart * 1000).toISOString(),
      periodEnd: new Date(periodEnd * 1000).toISOString(),
      activeManagedUsers: activeCount,
    });
  }

  async invoiceActiveManagedUsers(
    payload: Parameters<PlatformOrganizationBillingTasks["invoiceActiveManagedUsers"]>[0]
  ): Promise<void> {
    const {
      organizationIds,
      periodStart,
      periodEnd,
      billingEmail,
      pricePerUserInCents,
      currency,
      stripeCustomerId: existingCustomerId,
    } = payload;
    const { billingProviderService, logger } = this.dependencies;

    let totalActiveUsers = 0;
    for (const organizationId of organizationIds) {
      const count = await this.getActiveManagedUsersCount(organizationId, periodStart, periodEnd);
      logger.info("Counted active managed users for org", { organizationId, activeCount: count });
      totalActiveUsers += count;
    }

    if (totalActiveUsers === 0) {
      logger.info("No active managed users found across all organizations, skipping invoice creation", {
        organizationIds,
      });
      return;
    }

    const stripeCustomerId =
      existingCustomerId ??
      (
        await billingProviderService.createCustomer({
          email: billingEmail,
          metadata: {
            source: "active-managed-users-billing",
            organizationIds: organizationIds.join(","),
          },
        })
      ).stripeCustomerId;

    logger.info("Using Stripe customer for active managed users invoice", {
      stripeCustomerId,
      billingEmail,
      wasCreated: !existingCustomerId,
    });

    const totalAmount = totalActiveUsers * pricePerUserInCents;
    const periodStartISO = new Date(periodStart * 1000).toISOString();
    const periodEndISO = new Date(periodEnd * 1000).toISOString();

    const { invoiceId } = await billingProviderService.createInvoice({
      customerId: stripeCustomerId,
      autoAdvance: false,
      collectionMethod: "send_invoice",
      daysUntilDue: 30,
      pendingInvoiceItemsBehavior: "exclude",
      metadata: {
        source: "active-managed-users-billing",
        periodStart: periodStartISO,
        periodEnd: periodEndISO,
        organizationIds: organizationIds.join(","),
      },
    });

    await billingProviderService.createInvoiceItem({
      customerId: stripeCustomerId,
      amount: totalAmount,
      currency,
      description: `Active managed users billing (${periodStartISO} - ${periodEndISO}): ${totalActiveUsers} users`,
      invoiceId,
      metadata: {
        activeUsers: String(totalActiveUsers),
        pricePerUser: String(pricePerUserInCents),
      },
    });

    const { invoiceUrl } = await billingProviderService.finalizeInvoice(invoiceId);

    logger.info("Created and finalized active managed users invoice", {
      invoiceId,
      invoiceUrl,
      stripeCustomerId,
      totalActiveUsers,
      totalAmount,
      currency,
      organizationIds,
    });
  }

  private async getActiveManagedUsersCount(
    organizationId: number,
    periodStart: number,
    periodEnd: number
  ): Promise<number> {
    const { managedUsersBillingRepository } = this.dependencies;

    const startDate = new Date(periodStart * 1000);
    const endDate = new Date(periodEnd * 1000);

    const managedUsersEmails =
      await managedUsersBillingRepository.getManagedUserEmailsByOrgId(organizationId);

    if (!managedUsersEmails || managedUsersEmails.length === 0) {
      return 0;
    }

    const activeManagedUserEmailsAsHost = await managedUsersBillingRepository.getActiveManagedUsersAsHost(
      organizationId,
      startDate,
      endDate
    );

    const activeHostEmailsSet = new Set(activeManagedUserEmailsAsHost.map((user) => user.email));
    const notActiveHostEmails = managedUsersEmails
      .filter((user) => !activeHostEmailsSet.has(user.email))
      .map((user) => user.email);

    let activeCount = activeManagedUserEmailsAsHost.length;

    if (notActiveHostEmails.length > 0) {
      const activeManagedUserEmailsAsAttendee =
        await managedUsersBillingRepository.getActiveManagedUsersAsAttendee(
          notActiveHostEmails,
          startDate,
          endDate
        );
      activeCount += activeManagedUserEmailsAsAttendee.length;
    }

    return activeCount;
  }
}
