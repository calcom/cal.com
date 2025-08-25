import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithEmail,
} from "@calcom/types/Credential";

import type {
  ICalendarSubscriptionRepository,
  SubscriptionWithSelectedCalendar,
} from "./CalendarSubscriptionRepository.interface";

export type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
};

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private readonly deps: {
      subscriptionRepo?: ICalendarSubscriptionRepository;
      selectedCalendarRepo?: SelectedCalendarRepository;
    } = {}
  ) {}
  private validateAndTransformCredential(
    credential: CredentialForCalendarService
  ): CredentialForCalendarServiceWithEmail {
    if (credential.delegatedTo && !credential.delegatedTo.serviceAccountKey.client_email) {
      throw new Error("Delegation credential missing required client_email");
    }

    return {
      ...credential,
      delegatedTo: credential.delegatedTo
        ? {
            serviceAccountKey: {
              client_email: credential.delegatedTo.serviceAccountKey.client_email!,
              client_id: credential.delegatedTo.serviceAccountKey.client_id,
              private_key: credential.delegatedTo.serviceAccountKey.private_key,
            },
          }
        : null,
    };
  }

  async watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined> {
    log.debug("watchCalendar", safeStringify({ calendarId }));

    try {
      const credentialWithEmail = this.validateAndTransformCredential(credential);

      const { CalendarSubscriptionService } = await import(
        "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
      );
      const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);

      return await subscriptionService.watchCalendar(calendarId);
    } catch (error) {
      log.error(`Failed to watch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async unwatchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService,
    channelId: string,
    resourceId: string
  ): Promise<void> {
    log.debug("unwatchCalendar", safeStringify({ calendarId, channelId, resourceId }));

    try {
      const credentialWithEmail = this.validateAndTransformCredential(credential);

      const { CalendarSubscriptionService } = await import(
        "@calcom/app-store/googlecalendar/lib/CalendarSubscriptionService"
      );
      const subscriptionService = new CalendarSubscriptionService(credentialWithEmail);

      await subscriptionService.unwatchCalendar(calendarId, channelId, resourceId);
      log.info(`Successfully unwatched calendar ${calendarId}`);
    } catch (error) {
      log.error(`Failed to unwatch calendar ${calendarId}`, safeStringify(error));
      throw error;
    }
  }

  async processNextBatch(options?: { batchSize?: number }) {
    const subscriptionRepo = this.deps.subscriptionRepo;
    const selectedCalendarRepo = this.deps.selectedCalendarRepo;

    if (!subscriptionRepo || !selectedCalendarRepo) {
      throw new Error("Missing repositories in CalendarSubscriptionService.deps");
    }

    const batchSize = options?.batchSize ?? 50;

    let createdCount = 0;
    let watchedCount = 0;
    let errorCount = 0;

    // 1) Create missing subscriptions for eligible selected calendars
    const selectedCalendars = await selectedCalendarRepo.getNextBatchForSqlCache(batchSize);
    if (selectedCalendars.length > 0) {
      try {
        const selectedCalendarIds = selectedCalendars.map((selectedCalendar) => selectedCalendar.id);
        await subscriptionRepo.upsertManyBySelectedCalendarId(selectedCalendarIds);
        createdCount = selectedCalendars.length;
      } catch (error) {
        log.error("Failed to bulk upsert subscriptions for selected calendars", safeStringify({ error }));
        errorCount += selectedCalendars.length;
      }
    }

    // 2) Watch subscriptions that need watch/renewal
    const subscriptionsToWatch: SubscriptionWithSelectedCalendar[] =
      await subscriptionRepo.getSubscriptionsToWatch(batchSize);

    for (const subscription of subscriptionsToWatch) {
      try {
        if (!subscription.selectedCalendar?.credential) {
          log.warn(
            `Subscription ${subscription.id} has no credential, marking as error to prevent infinite retries`
          );
          await subscriptionRepo.setWatchError(
            subscription.id,
            "No credential available for calendar subscription"
          );
          errorCount++;
          continue;
        }

        const credentialForCalendarCache = await getCredentialForCalendarCache({
          credentialId: subscription.selectedCalendar.credential.id,
        });

        if (!credentialForCalendarCache) {
          log.warn(`No credential found for calendar cache for subscription ${subscription.id}`);
          await subscriptionRepo.setWatchError(subscription.id, "No credential found for calendar cache");
          errorCount++;
          continue;
        }

        const watchResult = await this.watchCalendar(
          subscription.selectedCalendar.externalId,
          credentialForCalendarCache
        );

        if (watchResult?.id && watchResult?.expiration) {
          const exp = watchResult.expiration;
          const channelExpiration = /^(\d+)$/.test(exp) ? new Date(Number(exp)) : new Date(exp);

          await subscriptionRepo.updateWatchDetails(subscription.id, {
            channelId: watchResult.id,
            channelKind: watchResult.kind || "",
            channelResourceId: watchResult.resourceId || "",
            channelResourceUri: watchResult.resourceUri || "",
            channelExpiration,
          });

          await subscriptionRepo.clearWatchError(subscription.id);
          watchedCount++;
        } else {
          await subscriptionRepo.setWatchError(
            subscription.id,
            "Invalid watch response: missing channel id and/or expiration"
          );
          errorCount++;
          continue;
        }
      } catch (error) {
        log.error(`Failed to watch calendar subscription ${subscription.id}:`, safeStringify({ error }));
        await subscriptionRepo.setWatchError(
          subscription.id,
          error instanceof Error ? error.message : String(error)
        );
        errorCount++;
      }
    }

    return {
      createdCount,
      watchedCount,
      errorCount,
      totalProcessed: (selectedCalendars?.length ?? 0) + subscriptionsToWatch.length,
    };
  }
}
