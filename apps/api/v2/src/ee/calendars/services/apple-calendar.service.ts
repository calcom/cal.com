import { CalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { BadRequestException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS, APPLE_CALENDAR_TYPE, APPLE_CALENDAR_ID } from "@calcom/platform-constants";
import { symmetricEncrypt, CalendarService } from "@calcom/platform-libraries";

@Injectable()
export class AppleCalendarService implements CalendarApp {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly credentialRepository: CredentialsRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async save(accessToken: string, username?: string, password?: string): Promise<{ status: string }> {
    return await this.saveCalendarCredentialsAndRedirect(accessToken, username ?? "", password ?? "");
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return {
      status: SUCCESS_STATUS,
    };
  }

  async saveCalendarCredentialsAndRedirect(accessToken: string, username: string, password: string) {
    if (username.length > 1 || password.length > 1)
      throw new BadRequestException(`Username or password cannot be empty`);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    const user = await this.dbRead.prisma.user.findFirstOrThrow({
      where: {
        id: ownerId,
      },
      select: {
        email: true,
        id: true,
      },
    });

    const data = {
      type: APPLE_CALENDAR_TYPE,
      key: symmetricEncrypt(
        JSON.stringify({ username, password }),
        process.env.CALENDSO_ENCRYPTION_KEY || ""
      ),
      userId: user.id,
      teamId: null,
      appId: APPLE_CALENDAR_ID,
      invalid: false,
    };

    try {
      const dav = new CalendarService({
        id: 0,
        ...data,
        user: { email: user.email },
      });
      await dav?.listCalendars();
      await this.dbWrite.prisma.credential.create({
        data,
      });
    } catch (reason) {
      throw new BadRequestException(`Could not add this apple calendar account: ${reason}`);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
