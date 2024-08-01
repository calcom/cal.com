import { CredentialSyncCalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS, APPLE_CALENDAR_TYPE, APPLE_CALENDAR_ID } from "@calcom/platform-constants";
import { symmetricEncrypt, CalendarService } from "@calcom/platform-libraries-0.0.22";

@Injectable()
export class AppleCalendarService implements CredentialSyncCalendarApp {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly credentialRepository: CredentialsRepository
  ) {}

  async save(
    userId: number,
    userEmail: string,
    username: string,
    password: string
  ): Promise<{ status: string }> {
    return await this.saveCalendarCredentials(userId, userEmail, username, password);
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const appleCalendarCredentials = await this.credentialRepository.getByTypeAndUserId(
      APPLE_CALENDAR_TYPE,
      userId
    );

    if (!appleCalendarCredentials) {
      throw new BadRequestException("Credentials for apple calendar not found.");
    }

    if (appleCalendarCredentials.invalid) {
      throw new BadRequestException("Invalid apple calendar credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const appleCalendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === APPLE_CALENDAR_TYPE
    );
    if (!appleCalendar) {
      throw new UnauthorizedException("Apple calendar not connected.");
    }
    if (appleCalendar.error?.message) {
      throw new UnauthorizedException(appleCalendar.error?.message);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }

  async saveCalendarCredentials(userId: number, userEmail: string, username: string, password: string) {
    if (username.length <= 1 || password.length <= 1)
      throw new BadRequestException(`Username or password cannot be empty`);

    const data = {
      type: APPLE_CALENDAR_TYPE,
      key: symmetricEncrypt(
        JSON.stringify({ username, password }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: userId,
      teamId: null,
      appId: APPLE_CALENDAR_ID,
      invalid: false,
    };

    try {
      const dav = new CalendarService({
        id: 0,
        ...data,
        user: { email: userEmail },
      });
      await dav?.listCalendars();
      await this.credentialRepository.createAppCredential(APPLE_CALENDAR_TYPE, data.key, userId);
    } catch (reason) {
      throw new BadRequestException(`Could not add this apple calendar account: ${reason}`);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
