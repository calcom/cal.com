import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { ErrorWithCode } from "@calcom/lib/errors";

import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { getCalendarCredentials, getConnectedCalendars } from "../lib/CalendarManager";
import type { DestinationCalendarRepository } from "../repositories/DestinationCalendarRepository";

type ConnectedCalendarCalendar = NonNullable<
  Awaited<ReturnType<typeof getConnectedCalendars>>["connectedCalendars"][number]["calendars"]
>[number];

interface IDestinationCalendarServiceDeps {
  destinationCalendarRepository: DestinationCalendarRepository;
  eventTypeRepository: EventTypeRepository;
}

interface SetDestinationCalendarInput {
  userId: number;
  userEmail: string;
  userLevelSelectedCalendars: { externalId: string }[];
  integration: string;
  externalId: string;
  eventTypeId?: number | null;
}

export class DestinationCalendarService {
  constructor(private deps: IDestinationCalendarServiceDeps) {}

  /**
   * It identifies the destination calendar by externalId, integration and eventTypeId and doesn't consider the `credentialId` or destinationCalendar.id
   * Also, DestinationCalendar doesn't have unique constraint on externalId, integration and eventTypeId, so there could be multiple destinationCalendars with same externalId, integration and eventTypeId in DB.
   * So, it could update any of the destinationCalendar when there are duplicates in DB. Ideally we should have unique constraint on externalId, integration and eventTypeId.
   *
   * With the addition of Delegation credential, it adds another dimension to the problem.
   * A user could have DelegationCredential and non-Delegation credential for the same calendar and he might be selecting Delegation credential connected calendar but it could still be set with nullish destinationCalendar.delegationCredentialId.
   */
  async setDestinationCalendar(input: SetDestinationCalendarInput) {
    const { userId, userEmail, userLevelSelectedCalendars, integration, externalId, eventTypeId } = input;

    if (eventTypeId) {
      const eventType = await this.deps.eventTypeRepository.findByIdWithUserAccess({ id: eventTypeId, userId });
      if (!eventType) {
        throw ErrorWithCode.Factory.Forbidden(`You don't have access to event type ${eventTypeId}`);
      }
    }

    const credentials = await getUsersCredentialsIncludeServiceAccountKey({ id: userId, email: userEmail });
    const calendarCredentials = getCalendarCredentials(credentials);
    const { connectedCalendars } = await getConnectedCalendars(
      calendarCredentials,
      userLevelSelectedCalendars
    );

    const allCals = connectedCalendars.flatMap((cal) => cal.calendars ?? []);

    const firstConnectedCalendar = this.getFirstConnectedCalendar({
      connectedCalendars,
      matcher: (cal) =>
        cal.externalId === externalId && cal.integration === integration && cal.readOnly === false,
    });

    const { credentialId, delegationCredentialId } = firstConnectedCalendar || {};

    if (!credentialId && !delegationCredentialId) {
      throw ErrorWithCode.Factory.BadRequest(`Could not find calendar ${externalId}`);
    }

    const primaryEmail =
      allCals.find(
        (cal) =>
          cal.primary &&
          (cal.credentialId === credentialId ||
            (!!cal.delegationCredentialId && cal.delegationCredentialId === delegationCredentialId))
      )?.email ?? null;

    let where: { eventTypeId: number } | { userId: number };

    if (eventTypeId) {
      where = { eventTypeId };
    } else {
      where = { userId };
    }

    await this.deps.destinationCalendarRepository.upsert({
      where,
      update: { integration, externalId, primaryEmail, credentialId, delegationCredentialId },
      create: { ...where, integration, externalId, primaryEmail, credentialId, delegationCredentialId },
    });
  }

  private getFirstConnectedCalendar({
    connectedCalendars,
    matcher,
  }: {
    connectedCalendars: Awaited<ReturnType<typeof getConnectedCalendars>>["connectedCalendars"];
    matcher: (calendar: ConnectedCalendarCalendar) => boolean;
  }) {
    const calendars = connectedCalendars.flatMap((c) => c.calendars ?? []);
    const matchingCalendars = calendars.filter(matcher);
    // Prefer delegation credential calendar as there could be other one due to existing connections even after DelegationCredential is enabled.
    return matchingCalendars.find((cal) => !!cal.delegationCredentialId) ?? matchingCalendars[0];
  }
}
