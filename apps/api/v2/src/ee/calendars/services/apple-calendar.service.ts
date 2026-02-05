import { CredentialSyncCalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { SUCCESS_STATUS, APPLE_CALENDAR_TYPE, APPLE_CALENDAR_ID } from "@calcom/platform-constants";
import { symmetricEncrypt, symmetricDecrypt } from "@calcom/platform-libraries";
import { BuildCalendarService } from "@calcom/platform-libraries/app-store";
import type { Credential } from "@calcom/prisma/client";

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
    const appleCalendarCredentials = await this.credentialRepository.findCredentialByTypeAndUserId(
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
    if (!username || !password || username.length <= 1 || password.length <= 1) {
      throw new BadRequestException(`Username or password cannot be empty`);
    }

    const existingAppleCalendarCredentials = await this.credentialRepository.getAllUserCredentialsByTypeAndId(
      APPLE_CALENDAR_TYPE,
      userId
    );

    let hasMatchingUsernameAndPassword = false;

    if (existingAppleCalendarCredentials.length > 0) {
      const hasCalendarWithGivenCredentials = existingAppleCalendarCredentials.find(
        (calendarCredential: Credential) => {
          const decryptedKey = JSON.parse(
            symmetricDecrypt(calendarCredential.key as string, process.env.CALENDSO_ENCRYPTION_KEY || "")
          );

          if (decryptedKey.username === username) {
            if (decryptedKey.password === password) {
              hasMatchingUsernameAndPassword = true;
            }

            return true;
          }
        }
      );

      if (!!hasCalendarWithGivenCredentials && hasMatchingUsernameAndPassword) {
        return {
          status: SUCCESS_STATUS,
        };
      }

      if (!!hasCalendarWithGivenCredentials && !hasMatchingUsernameAndPassword) {
        await this.credentialRepository.upsertUserAppCredential(
          APPLE_CALENDAR_TYPE,
          symmetricEncrypt(JSON.stringify({ username, password }), process.env.CALENDSO_ENCRYPTION_KEY || ""),
          userId,
          hasCalendarWithGivenCredentials.id
        );

        return {
          status: SUCCESS_STATUS,
        };
      }
    }

    try {
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
        delegationCredentialId: null,
        encryptedKey: null,
      };

      const dav = BuildCalendarService({
        id: 0,
        ...data,
        user: { email: userEmail },
      });
      await dav?.listCalendars();
      await this.credentialRepository.upsertUserAppCredential(APPLE_CALENDAR_TYPE, data.key, userId);
    } catch (reason) {
      throw new BadRequestException(`Could not add this apple calendar account: ${reason}`);
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
