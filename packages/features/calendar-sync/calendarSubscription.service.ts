import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { CalendarSubscriptionStatus } from "@calcom/prisma/enums";

import { CalendarSubscriptionRepository } from "./calendarSubscription.repository";

const log = logger.getSubLogger({ prefix: ["[CalendarSubscriptionService]"] });
type Timestamp = number;
type ProviderSubscriptionDetails = {
  id: string | null;
  kind: string | null;
  resourceId: string | null;
  resourceUri: string | null;
  expiration: Timestamp | null;
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
  static async findActiveProviderSubscriptionInSelectedCalendarToo({
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
    const existingSubscription = await CalendarSubscriptionRepository.findFirst({
      where: {
        externalCalendarId,
        // We query for ACTIVE because only those would have have provider details set
        status: CalendarSubscriptionStatus.ACTIVE,
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
          expiration: existingSubscription.providerExpiration?.getTime() ?? null,
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
      select: {
        id: true,
        googleChannelId: true,
        googleChannelKind: true,
        googleChannelResourceId: true,
        googleChannelResourceUri: true,
        googleChannelExpiration: true,
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
          // googleChannelExpiration is a timestamp as string
          expiration: Number(selectedCalendarWithSubscription.googleChannelExpiration),
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
    return CalendarSubscriptionRepository.findFirst({
      where: {
        externalCalendarId: externalId,
        providerType: integration,
      },
    });
  }

  /**
   * Create a new CalendarSubscription record with PENDING status
   */
  static async createIfNotExists({
    credentialId,
    externalCalendarId,
    data,
  }: {
    credentialId: number;
    externalCalendarId: string;
    data: {
      providerType: string;
      status: CalendarSubscriptionStatus;
      calendarSyncId: string | null;
    };
  }) {
    log.debug(
      "Creating new subscription if not exists",
      safeStringify({ credentialId, externalCalendarId, data })
    );

    // First, let's check if a record already exists
    return CalendarSubscriptionRepository.upsert({
      where: {
        credentialId_externalCalendarId: {
          credentialId,
          externalCalendarId,
        },
      },
      updateData: {},
      createData: {
        externalCalendarId,
        credentialId,
        ...(data.calendarSyncId
          ? {
              calendarSync: {
                connect: {
                  id: data.calendarSyncId,
                },
              },
            }
          : {}),
        ...data,
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
    log.debug("Activating subscription", safeStringify({ subscriptionId }));

    return CalendarSubscriptionRepository.update({
      where: { id: subscriptionId },
      data: {
        providerSubscriptionId: providerDetails.id,
        providerSubscriptionKind: providerDetails.kind,
        providerResourceId: providerDetails.resourceId,
        providerResourceUri: providerDetails.resourceUri,
        providerExpiration: providerDetails.expiration ? new Date(providerDetails.expiration) : null,
        status: CalendarSubscriptionStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });
  }

  /**
   * Updates the status of a subscription to INACTIVE
   */
  static async deactivateSubscription(subscriptionId: string) {
    log.debug("Deactivating subscription", safeStringify({ subscriptionId }));

    return CalendarSubscriptionRepository.update({
      where: { id: subscriptionId },
      data: { status: CalendarSubscriptionStatus.INACTIVE },
    });
  }

  static async findAllRequiringRenewalOrActivation({ batchSize }: { batchSize: number }) {
    return CalendarSubscriptionRepository.findManyRequiringRenewalOrActivation({ batchSize });
  }

  static async markAsUsedForSync({ subscriptionId }: { subscriptionId: string }) {
    return CalendarSubscriptionRepository.update({
      where: { id: subscriptionId },
      data: { lastSyncAt: new Date() },
    });
  }

  static async setErrorInWatching({ id, error }: { id: string; error: string }) {
    return CalendarSubscriptionRepository.update({
      where: { id },
      data: { lastError: error, lastErrorAt: new Date() },
    });
  }
}
