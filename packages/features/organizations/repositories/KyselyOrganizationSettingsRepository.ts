import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IOrganizationSettingsRepository, OrganizationEmailSettingsDto } from "./IOrganizationSettingsRepository";

export class KyselyOrganizationSettingsRepository implements IOrganizationSettingsRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async getEmailSettings(organizationId: number): Promise<OrganizationEmailSettingsDto | null> {
    const result = await this.dbRead
      .selectFrom("OrganizationSettings")
      .select([
        "disableAttendeeConfirmationEmail",
        "disableAttendeeCancellationEmail",
        "disableAttendeeRescheduledEmail",
        "disableAttendeeRequestEmail",
        "disableAttendeeReassignedEmail",
        "disableAttendeeAwaitingPaymentEmail",
        "disableAttendeeRescheduleRequestEmail",
        "disableAttendeeLocationChangeEmail",
        "disableAttendeeNewEventEmail",
      ])
      .where("organizationId", "=", organizationId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      disableAttendeeConfirmationEmail: result.disableAttendeeConfirmationEmail,
      disableAttendeeCancellationEmail: result.disableAttendeeCancellationEmail,
      disableAttendeeRescheduledEmail: result.disableAttendeeRescheduledEmail,
      disableAttendeeRequestEmail: result.disableAttendeeRequestEmail,
      disableAttendeeReassignedEmail: result.disableAttendeeReassignedEmail,
      disableAttendeeAwaitingPaymentEmail: result.disableAttendeeAwaitingPaymentEmail,
      disableAttendeeRescheduleRequestEmail: result.disableAttendeeRescheduleRequestEmail,
      disableAttendeeLocationChangeEmail: result.disableAttendeeLocationChangeEmail,
      disableAttendeeNewEventEmail: result.disableAttendeeNewEventEmail,
    };
  }
}
