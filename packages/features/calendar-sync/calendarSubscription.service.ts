import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[CalendarSubscriptionService]"] });
type ProviderSubscriptionDetails = {
  id: string | null;
  kind: string | null;
  resourceId: string | null;
  resourceUri: string | null;
  expiration: string | null;
};
/**
 * CalendarSubscriptionService centralizes subscription management logic across calendar providers
 * It handles finding, reusing, and creating calendar subscriptions
 */
export class CalendarSubscriptionService {
  /**
   * Find an existing subscription from either CalendarSubscription or SelectedCalendar tables
   * Returns normalized subscription data regardless of source
   */
  static async findExistingProviderSubscription({
    externalCalendarId,
    integration,
  }: {
    externalCalendarId: string;
    integration: string;
  }): Promise<
    | ((
        | {
            source: "CalendarSubscription";
            subscriptionId: string;
            fromSelectedCalendar: false;
          }
        | {
            source: "SelectedCalendar";
            selectedCalendarId: string;
            fromSelectedCalendar: true;
          }
      ) & {
        providerDetails: ProviderSubscriptionDetails;
      })
    | null
  > {
    log.debug("Finding existing subscription", safeStringify({ externalCalendarId, integration }));

    // First check for active subscription in CalendarSubscription
    const existingSubscription = await prisma.calendarSubscription.findFirst({
      where: {
        externalCalendarId,
        status: "ACTIVE",
        providerType: integration,
      },
    });

    if (existingSubscription) {
      log.debug(
        `Found existing subscription in CalendarSubscription table`,
        safeStringify({
          subscriptionId: existingSubscription.id,
          providerSubscriptionId: existingSubscription.providerSubscriptionId,
        })
      );

      return {
        source: "CalendarSubscription",
        subscriptionId: existingSubscription.id,
        fromSelectedCalendar: false,
        providerDetails: {
          id: existingSubscription.providerSubscriptionId,
          kind: existingSubscription.providerSubscriptionKind,
          resourceId: existingSubscription.providerResourceId,
          resourceUri: existingSubscription.providerResourceUri,
          expiration: existingSubscription.providerExpiration?.toISOString() ?? null,
        },
      };
    }

    // If not found in CalendarSubscription, check in SelectedCalendar
    const selectedCalendarWithSubscription = await prisma.selectedCalendar.findFirst({
      where: {
        externalId: externalCalendarId,
        integration,
        googleChannelId: {
          not: null,
        },
      },
    });

    if (selectedCalendarWithSubscription?.googleChannelId) {
      log.debug(
        `Found existing subscription in SelectedCalendar table`,
        safeStringify({
          selectedCalendarId: selectedCalendarWithSubscription.id,
          googleChannelId: selectedCalendarWithSubscription.googleChannelId,
        })
      );

      if (
        !selectedCalendarWithSubscription.googleChannelKind ||
        !selectedCalendarWithSubscription.googleChannelResourceId ||
        !selectedCalendarWithSubscription.googleChannelResourceUri ||
        !selectedCalendarWithSubscription.googleChannelExpiration
      ) {
        log.error(
          `SelectedCalendar ${selectedCalendarWithSubscription.id} has missing provider details`,
          safeStringify({
            missing: {
              kind: !selectedCalendarWithSubscription.googleChannelKind,
              resourceId: !selectedCalendarWithSubscription.googleChannelResourceId,
              resourceUri: !selectedCalendarWithSubscription.googleChannelResourceUri,
              expiration: !selectedCalendarWithSubscription.googleChannelExpiration,
            },
          })
        );
        return null;
      }

      return {
        source: "SelectedCalendar",
        fromSelectedCalendar: true,
        selectedCalendarId: selectedCalendarWithSubscription.id,
        providerDetails: {
          id: selectedCalendarWithSubscription.googleChannelId,
          kind: selectedCalendarWithSubscription.googleChannelKind,
          resourceId: selectedCalendarWithSubscription.googleChannelResourceId,
          resourceUri: selectedCalendarWithSubscription.googleChannelResourceUri,
          expiration: selectedCalendarWithSubscription.googleChannelExpiration,
        },
      };
    }

    log.debug("No existing subscription found", safeStringify({ externalCalendarId, integration }));
    return null;
  }

  static async findbyExternalIdAndIntegration({
    externalId,
    integration,
  }: {
    externalId: string;
    integration: string;
  }) {
    return await prisma.calendarSubscription.findFirst({
      where: {
        externalCalendarId: externalId,
        providerType: integration,
      },
    });
  }

  /**
   * Create a new CalendarSubscription record with PENDING status
   */
  static async createPendingSubscription({
    credentialId,
    externalCalendarId,
    integration,
  }: {
    credentialId: number;
    externalCalendarId: string;
    integration: string;
  }) {
    log.debug(
      "Creating new PENDING subscription",
      safeStringify({ credentialId, externalCalendarId, integration })
    );

    return await prisma.calendarSubscription.create({
      data: {
        credentialId,
        externalCalendarId,
        providerType: integration,
        status: "PENDING",
      },
    });
  }

  /**
   * Create an ACTIVE CalendarSubscription from an existing SelectedCalendar subscription
   */
  static async createActiveSubscriptionFromSelectedCalendar({
    credentialId,
    externalCalendarId,
    integration,
    providerDetails,
  }: {
    credentialId: number;
    externalCalendarId: string;
    integration: string;
    providerDetails: ProviderSubscriptionDetails;
  }) {
    log.debug(
      "Creating new ACTIVE subscription from SelectedCalendar data",
      safeStringify({ credentialId, externalCalendarId, integration, providerDetails })
    );

    return await prisma.calendarSubscription.create({
      data: {
        credentialId,
        externalCalendarId,
        providerType: integration,
        status: "ACTIVE",
        providerSubscriptionId: providerDetails.id,
        providerSubscriptionKind: providerDetails.kind,
        providerResourceId: providerDetails.resourceId,
        providerResourceUri: providerDetails.resourceUri,
        providerExpiration: providerDetails.expiration ? new Date(Number(providerDetails.expiration)) : null,
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Update a CalendarSubscription from PENDING to ACTIVE with provider details
   */
  static async activateSubscription({
    subscriptionId,
    providerDetails,
  }: {
    subscriptionId: string;
    providerDetails: ProviderSubscriptionDetails;
  }) {
    log.debug("Activating subscription", safeStringify({ subscriptionId, providerDetails }));

    return await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: {
        providerSubscriptionId: providerDetails.id,
        providerSubscriptionKind: providerDetails.kind,
        providerResourceId: providerDetails.resourceId,
        providerResourceUri: providerDetails.resourceUri,
        providerExpiration: providerDetails.expiration ? new Date(Number(providerDetails.expiration)) : null,
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Link a CalendarSync record to an existing subscription
   */
  static async linkCalendarSyncToSubscription({
    calendarSyncId,
    subscriptionId,
  }: {
    calendarSyncId: string;
    subscriptionId: string;
  }) {
    log.debug("Linking CalendarSync to subscription", safeStringify({ calendarSyncId, subscriptionId }));

    return await prisma.calendarSync.update({
      where: { id: calendarSyncId },
      data: { subscriptionId },
    });
  }

  /**
   * Updates the status of a subscription to INACTIVE
   */
  static async deactivateSubscription(subscriptionId: string) {
    log.debug("Deactivating subscription", safeStringify({ subscriptionId }));

    return await prisma.calendarSubscription.update({
      where: { id: subscriptionId },
      data: { status: "INACTIVE" },
    });
  }

  /**
   * Find all calendars that are using a particular subscription
   */
  // static async findCalendarsUsingSubscription({
  //   credentialId,
  //   externalCalendarId,
  //   integration,
  //   excludeEventTypeIds = [],
  // }: {
  //   credentialId: number;
  //   externalCalendarId: string;
  //   integration: string;
  //   excludeEventTypeIds?: number[];
  // }) {
  //   const [selectedCalendars, calendarSyncs] = await Promise.all([
  //     prisma.selectedCalendar.findMany({
  //       where: {
  //         credentialId,
  //         externalId: externalCalendarId,
  //         integration,
  //         googleChannelId: {
  //           not: null,
  //         },
  //         eventTypeId:
  //           excludeEventTypeIds.length > 0
  //             ? {
  //                 notIn: excludeEventTypeIds,
  //               }
  //             : undefined,
  //       },
  //     }),
  //     prisma.calendarSync.findMany({
  //       where: {
  //         credentialId,
  //         externalCalendarId,
  //         integration,
  //         subscription: {
  //           status: "ACTIVE",
  //         },
  //       },
  //       include: {
  //         subscription: true,
  //       },
  //     }),
  //   ]);

  //   return { selectedCalendars, calendarSyncs };
  // }
}
