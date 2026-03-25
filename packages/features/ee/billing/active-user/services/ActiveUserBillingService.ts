import type { ActiveUserBillingRepository } from "../repositories/ActiveUserBillingRepository";

export interface ActiveUsersBreakdown {
  activeUsers: Array<{
    id: number;
    email: string;
    name: string | null;
    activeAs: "host" | "attendee";
  }>;
  totalMembers: number;
  activeHosts: number;
  activeAttendees: number;
}

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
      await this.deps.activeUserBillingRepository.getManagedUserEmailsBySubscriptionId(subscriptionId);

    if (managedUserEmails.length === 0) return 0;

    const activeHosts = await this.deps.activeUserBillingRepository.getActivePlatformUsersAsHost(
      subscriptionId,
      periodStart,
      periodEnd
    );

    const activeHostEmails = new Set(activeHosts.map((h) => h.email));

    const nonHostEmails = managedUserEmails
      .map((u) => u.email)
      .filter((email) => !activeHostEmails.has(email));

    if (nonHostEmails.length === 0) return activeHostEmails.size;

    const activeAttendees = await this.deps.activeUserBillingRepository.getActiveUsersAsAttendee(
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
  async getActiveUserCountForOrg(orgId: number, periodStart: Date, periodEnd: Date): Promise<number> {
    const memberEmails = await this.deps.activeUserBillingRepository.getOrgMemberEmailsByOrgId(orgId);

    return this.countActiveUsers(
      memberEmails.map((u) => u.email),
      periodStart,
      periodEnd
    );
  }

  /**
   * Get only active users (hosts + attendees) for an org.
   * Inactive members are excluded from the result to keep the payload small.
   */
  async getActiveUsersForOrg(
    orgId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ActiveUsersBreakdown> {
    const memberDetails =
      await this.deps.activeUserBillingRepository.getOrgMemberDetailsByOrgId(orgId);

    if (memberDetails.length === 0) {
      return { activeUsers: [], totalMembers: 0, activeHosts: 0, activeAttendees: 0 };
    }

    const emails = memberDetails.map((m) => m.email);
    const memberByEmail = new Map(memberDetails.map((m) => [m.email, m]));

    const activeHosts = await this.deps.activeUserBillingRepository.getActiveUsersAsHost(
      emails,
      periodStart,
      periodEnd
    );
    const activeHostEmails = new Set(activeHosts.map((h) => h.email));

    const nonHostEmails = emails.filter((e) => !activeHostEmails.has(e));

    const activeAttendees =
      nonHostEmails.length > 0
        ? await this.deps.activeUserBillingRepository.getActiveUsersAsAttendee(
            nonHostEmails,
            periodStart,
            periodEnd
          )
        : [];
    const activeAttendeeEmails = new Set(activeAttendees.map((a) => a.email));

    const activeUsers: ActiveUsersBreakdown["activeUsers"] = [];

    for (const email of Array.from(activeHostEmails)) {
      const m = memberByEmail.get(email);
      if (m) activeUsers.push({ id: m.id, email: m.email, name: m.name, activeAs: "host" });
    }
    for (const email of Array.from(activeAttendeeEmails)) {
      const m = memberByEmail.get(email);
      if (m) activeUsers.push({ id: m.id, email: m.email, name: m.name, activeAs: "attendee" });
    }

    return {
      activeUsers,
      totalMembers: memberDetails.length,
      activeHosts: activeHostEmails.size,
      activeAttendees: activeAttendeeEmails.size,
    };
  }

  async getBookingsForUser(
    userId: number,
    email: string,
    activeAs: "host" | "attendee",
    periodStart: Date,
    periodEnd: Date
  ): Promise<
    Array<{
      id: number;
      uid: string;
      title: string;
      startTime: Date;
      endTime: Date;
      otherParty: string;
    }>
  > {
    if (activeAs === "host") {
      const bookings = await this.deps.activeUserBillingRepository.getBookingsByHostUserId(
        userId,
        periodStart,
        periodEnd
      );
      return bookings.map((b) => ({
        id: b.id,
        uid: b.uid,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        otherParty: b.attendees.map((a) => a.name || a.email).join(", "),
      }));
    }

    const bookings = await this.deps.activeUserBillingRepository.getBookingsByAttendeeEmail(
      email,
      periodStart,
      periodEnd
    );
    return bookings.map((b) => ({
      id: b.id,
      uid: b.uid,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      otherParty: b.user ? b.user.name || b.user.email : "-",
    }));
  }

  private async countActiveUsers(
    candidateEmails: string[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    if (candidateEmails.length === 0) return 0;

    const activeHosts = await this.deps.activeUserBillingRepository.getActiveUsersAsHost(
      candidateEmails,
      periodStart,
      periodEnd
    );

    const activeHostEmails = new Set(activeHosts.map((h) => h.email));

    const nonHostEmails = candidateEmails.filter((email) => !activeHostEmails.has(email));

    if (nonHostEmails.length === 0) return activeHostEmails.size;

    const activeAttendees = await this.deps.activeUserBillingRepository.getActiveUsersAsAttendee(
      nonHostEmails,
      periodStart,
      periodEnd
    );

    return activeHostEmails.size + activeAttendees.length;
  }
}
