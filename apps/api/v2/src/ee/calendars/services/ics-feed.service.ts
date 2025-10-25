import { ICSFeedCalendarApp } from "@/ee/calendars/calendars.interface";
import { CreateIcsFeedOutputResponseDto } from "@/ee/calendars/input/create-ics.output";
import { CalendarsCacheService } from "@/ee/calendars/services/calendars-cache.service";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { BadRequestException, UnauthorizedException, Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS, ICS_CALENDAR_TYPE, ICS_CALENDAR } from "@calcom/platform-constants";
import { symmetricEncrypt } from "@calcom/platform-libraries";
import { IcsFeedCalendarService } from "@calcom/platform-libraries/app-store";

@Injectable()
export class IcsFeedService implements ICSFeedCalendarApp {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly calendarsCacheService: CalendarsCacheService,
    private readonly credentialRepository: CredentialsRepository,
    private readonly redisService: RedisService
  ) {}

  private logger = new Logger("IcsFeedService");

  async save(
    userId: number,
    userEmail: string,
    urls: string[],
    readonly = true
  ): Promise<CreateIcsFeedOutputResponseDto> {
    const data = {
      type: ICS_CALENDAR_TYPE,
      ICS_CALENDAR,
      key: symmetricEncrypt(
        JSON.stringify({ urls, skipWriting: readonly }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: userId,
      teamId: null,
      appId: ICS_CALENDAR,
      invalid: false,
      delegationCredentialId: null,
    };

    try {
      const dav = new IcsFeedCalendarService({
        id: 0,
        ...data,
        user: { email: userEmail },
      });

      const listedCals = await dav.listCalendars();

      if (listedCals.length !== urls.length) {
        throw new BadRequestException(
          `Listed cals and URLs mismatch: ${listedCals.length} vs. ${urls.length}`
        );
      }

      const credential = await this.credentialRepository.upsertUserAppCredential(
        ICS_CALENDAR_TYPE,
        data.key,
        userId
      );

      await this.calendarsCacheService.deleteConnectedAndDestinationCalendarsCache(userId);

      return {
        status: SUCCESS_STATUS,
        data: {
          id: credential.id,
          type: credential.type,
          userId: credential.userId,
          teamId: credential.teamId,
          appId: credential.appId,
          invalid: credential.invalid,
        },
      };
    } catch (e) {
      this.logger.error("Could not add ICS feeds", e);
      throw new BadRequestException("Could not add ICS feeds, try using private ics feed.");
    }
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const icsFeedCredentials = await this.credentialRepository.findCredentialByTypeAndUserId(
      ICS_CALENDAR_TYPE,
      userId
    );

    if (!icsFeedCredentials) {
      throw new BadRequestException("Credentials for Ics Feed calendar not found.");
    }

    if (icsFeedCredentials.invalid) {
      throw new BadRequestException("Invalid Ics Feed credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const icsCalendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === ICS_CALENDAR_TYPE
    );

    if (!icsCalendar) {
      throw new UnauthorizedException("Ics Feed not connected.");
    }
    if (icsCalendar.error?.message) {
      throw new UnauthorizedException(icsCalendar.error?.message);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
