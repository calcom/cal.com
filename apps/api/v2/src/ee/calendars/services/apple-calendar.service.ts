import { CalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS, OFFICE_365_CALENDAR_TYPE } from "@calcom/platform-constants";
import { symmetricEncrypt, CalendarService } from "@calcom/platform-libraries";

@Injectable()
export class AppleCalendarService implements CalendarApp {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly credentialRepository: CredentialsRepository,
    private readonly dbRead: PrismaReadService
  ) {}

  async save(
    userId: number,
    username: string,
    password: string,
    origin: string,
    redir?: string
  ): Promise<{ url: string }> {
    return await this.saveCalendarCredentialsAndRedirect(code, accessToken, origin, redir);
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const office365CalendarCredentials = await this.credentialRepository.getByTypeAndUserId(
      "office365_calendar",
      userId
    );

    if (!office365CalendarCredentials) {
      throw new BadRequestException("Credentials for office_365_calendar not found.");
    }

    if (office365CalendarCredentials.invalid) {
      throw new BadRequestException("Invalid office 365 calendar credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const office365Calendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === OFFICE_365_CALENDAR_TYPE
    );
    if (!office365Calendar) {
      throw new UnauthorizedException("Office 365 calendar not connected.");
    }
    if (office365Calendar.error?.message) {
      throw new UnauthorizedException(office365Calendar.error?.message);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }

  // params requiured by this function
  // username, password, userId
  async saveCalendarCredentialsAndRedirect(
    userId: number,
    username: string,
    password: string,
    origin: string,
    redir?: string
  ) {
    const user = await this.dbRead.prisma.user.findFirstOrThrow({
      where: {
        id: userId,
      },
      select: {
        email: true,
        id: true,
      },
    });

    const data = {
      type: "apple_calendar",
      key: symmetricEncrypt(
        JSON.stringify({ username, password }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: "apple-calendar",
      invalid: false,
    };

    return {
      url: redir || origin,
    };
  }
}
