import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { CalendarsService } from "@/platform/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { RedisService } from "@/modules/redis/redis.service";

import { BuildIcsFeedCalendarService } from "@calcom/platform-libraries/app-store";

export const DEFAULT_CALENDARS_JOB = "default_calendars_job";
export const ICS_FEED_WARM_CACHE_JOB = "ics-feed-warm-cache";
export const CALENDARS_QUEUE = "calendars";
export const ICS_FEED_CACHE_TTL_MS = 15 * 60 * 1000;

export type DefaultCalendarsJobDataType = {
  userId: number;
};

export type IcsFeedWarmCacheJobDataType = {
  credentialId: number;
  userEmail: string;
};

@Processor(CALENDARS_QUEUE)
export class CalendarsProcessor {
  private readonly logger = new Logger(CalendarsProcessor.name);

  constructor(
    public readonly calendarsService: CalendarsService,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly redisService: RedisService
  ) {}

  @Process(DEFAULT_CALENDARS_JOB)
  async handleEnsureDefaultCalendars(job: Job<DefaultCalendarsJobDataType>) {
    const { userId } = job.data;
    try {
      // getCalendars calls getConnectedDestinationCalendarsAndEnsureDefaultsInDb from platform libraries
      // which gets the calendars from third party providers and ensure default destination and selected calendars are set in DB
      await this.calendarsService.getCalendars(userId, true);
    } catch (err) {
      this.logger.error(`Failed to load default calendars of user with id: ${userId}`, {
        userId,
        err,
      });
    }
    return;
  }

  @Process(ICS_FEED_WARM_CACHE_JOB)
  async handleIcsFeedWarmCache(job: Job<IcsFeedWarmCacheJobDataType>) {
    const { credentialId, userEmail } = job.data;

    const credential = await this.credentialsRepository.findCredentialById(credentialId);
    if (!credential) {
      this.logger.warn(`ICS feed warm-cache: credential ${credentialId} not found, skipping`);
      return;
    }

    const service = BuildIcsFeedCalendarService({
      ...credential,
      user: { email: userEmail },
    });

    const now = new Date();
    const dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const dateTo = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const events = await service.getAvailability({
        dateFrom,
        dateTo,
        selectedCalendars: [],
        mode: "none",
      });

      const cacheKey = `apiv2:credential:${credentialId}:ics-feed:events`;
      await this.redisService.set(cacheKey, events, { ttl: ICS_FEED_CACHE_TTL_MS });
    } catch (err) {
      this.logger.error(`ICS feed warm-cache failed for credential ${credentialId}`, err);
    }
  }
}
