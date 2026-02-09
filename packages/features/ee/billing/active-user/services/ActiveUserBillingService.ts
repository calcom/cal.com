import type { ActiveUserBillingRepository } from "../repositories/ActiveUserBillingRepository";

export interface IActiveUserBillingServiceDeps {
  activeUserBillingRepository: ActiveUserBillingRepository;
}

export class ActiveUserBillingService {
  constructor(private readonly deps: IActiveUserBillingServiceDeps) {}

  /**
   * Count active users for a platform organization (uses PlatformBilling subscription ID).
   * A user is "active" if they hosted or attended at least one booking in the period OR managed.
   *
   * Uses the platform-specific host query that filters on isPlatformManaged + subscriptionId
   * to ensure only bookings belonging to this org's managed users are counted.
   */
  async getActiveUserCountForPlatformOrg(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const managedUserEmails =
      await this.deps.activeUserBillingRepository.getManagedUserEmailsBySubscriptionId(
        subscriptionId
      );

    if (managedUserEmails.length === 0) return 0;

    const activeHosts =
      await this.deps.activeUserBillingRepository.getActivePlatformUsersAsHost(
        subscriptionId,
        periodStart,
        periodEnd
      );

    const activeHostEmails = new Set(activeHosts.map((h) => h.email));

    const nonHostEmails = managedUserEmails
      .map((u) => u.email)
      .filter((email) => !activeHostEmails.has(email));

    if (nonHostEmails.length === 0) return activeHostEmails.size;

    const activeAttendees =
      await this.deps.activeUserBillingRepository.getActiveUsersAsAttendee(
        nonHostEmails,
        periodStart,
        periodEnd
      );

    return activeHostEmails.size + activeAttendees.length;
  }

  /**
   * Count active users for a regular organization (uses org/team ID).
   * A user is "active" if they hosted or attended at least one booking in the period.
   */
  async getActiveUserCountForOrg(
    orgId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    const memberEmails =
      await this.deps.activeUserBillingRepository.getOrgMemberEmailsByOrgId(
        orgId
      );

    return this.countActiveUsers(
      memberEmails.map((u) => u.email),
      periodStart,
      periodEnd
    );
  }

  private async countActiveUsers(
    candidateEmails: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    if (candidateEmails.length === 0) return 0;

    const activeHosts =
      await this.deps.activeUserBillingRepository.getActiveUsersAsHost(
        candidateEmails,
        periodStart,
        periodEnd
      );

    const activeHostEmails = new Set(activeHosts.map((h) => h.email));

    const nonHostEmails = candidateEmails.filter(
      (email) => !activeHostEmails.has(email)
    );

    if (nonHostEmails.length === 0) return activeHostEmails.size;

    const activeAttendees =
      await this.deps.activeUserBillingRepository.getActiveUsersAsAttendee(
        nonHostEmails,
        periodStart,
        periodEnd
      );

    return activeHostEmails.size + activeAttendees.length;
  }
}
