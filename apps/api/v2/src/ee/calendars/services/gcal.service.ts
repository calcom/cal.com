import { BookingReferencesRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/booking-references.repository";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { OAuthCalendarApp } from "@/ee/calendars/calendars.interface";
import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { calendar_v3 } from "@googleapis/calendar";
import { Logger, NotFoundException } from "@nestjs/common";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { Request } from "express";
import { OAuth2Client, JWT } from "googleapis-common";
import { z } from "zod";

import { SUCCESS_STATUS, GOOGLE_CALENDAR_TYPE } from "@calcom/platform-constants";
import { DelegationCredentialRepository, OAuth2UniversalSchema } from "@calcom/platform-libraries/app-store";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

@Injectable()
export class GoogleCalendarService implements OAuthCalendarApp {
  private redirectUri = `${this.config.get("api.url")}/gcal/oauth/save`;
  private gcalResponseSchema = z.object({ client_id: z.string(), client_secret: z.string() });
  private logger = new Logger("GcalService");

  constructor(
    private readonly config: ConfigService,
    private readonly appsRepository: AppsRepository,
    private readonly credentialRepository: CredentialsRepository,
    private readonly calendarsService: CalendarsService,
    private readonly tokensRepository: TokensRepository,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingReferencesRepository: BookingReferencesRepository_2024_08_13
  ) {}

  async connect(
    authorization: string,
    req: Request,
    redir?: string,
    isDryRun?: boolean
  ): Promise<{ status: typeof SUCCESS_STATUS; data: { authUrl: string } }> {
    const accessToken = authorization.replace("Bearer ", "");
    const origin = req.get("origin") ?? req.get("host");
    const redirectUrl = await this.getCalendarRedirectUrl(accessToken, origin ?? "", redir, isDryRun);

    return { status: SUCCESS_STATUS, data: { authUrl: redirectUrl } };
  }

  async save(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string,
    isDryRun?: boolean
  ): Promise<{ url: string }> {
    return await this.saveCalendarCredentialsAndRedirect(code, accessToken, origin, redir, isDryRun);
  }

  async check(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    return await this.checkIfCalendarConnected(userId);
  }

  async getCalendarRedirectUrl(accessToken: string, origin: string, redir?: string, isDryRun?: boolean) {
    const oAuth2Client = await this.getOAuthClient(this.redirectUri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CALENDAR_SCOPES,
      prompt: "consent",
      state: `accessToken=${accessToken}&origin=${origin}&redir=${redir ?? ""}&isDryRun=${isDryRun}`,
    });

    return authUrl;
  }

  async getOAuthClient(redirectUri: string) {
    this.logger.log("Getting Google Calendar OAuth Client");
    const app = await this.appsRepository.getAppBySlug("google-calendar");

    if (!app) {
      throw new NotFoundException();
    }

    const { client_id, client_secret } = this.gcalResponseSchema.parse(app.keys);

    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirectUri);
    return oAuth2Client;
  }

  async checkIfCalendarConnected(userId: number): Promise<{ status: typeof SUCCESS_STATUS }> {
    const gcalCredentials = await this.credentialRepository.findCredentialByTypeAndUserId(
      "google_calendar",
      userId
    );

    if (!gcalCredentials) {
      throw new BadRequestException("Credentials for google_calendar not found.");
    }

    if (gcalCredentials.invalid) {
      throw new BadRequestException("Invalid google OAuth credentials.");
    }

    const { connectedCalendars } = await this.calendarsService.getCalendars(userId);
    const googleCalendar = connectedCalendars.find(
      (cal: { integration: { type: string } }) => cal.integration.type === GOOGLE_CALENDAR_TYPE
    );
    if (!googleCalendar) {
      throw new UnauthorizedException("Google Calendar not connected.");
    }
    if (googleCalendar.error?.message) {
      throw new UnauthorizedException(googleCalendar.error?.message);
    }

    return { status: SUCCESS_STATUS };
  }

  async saveCalendarCredentialsAndRedirect(
    code: string,
    accessToken: string,
    origin: string,
    redir?: string,
    isDryRun?: boolean
  ) {
    // User chose not to authorize your app or didn't authorize your app
    // redirect directly without oauth code
    if (!code || code === "undefined") {
      return { url: redir || origin };
    }

    // if isDryRun is true we know its a dry run so we just redirect straight away
    if (isDryRun) {
      return { url: redir || origin };
    }

    const parsedCode = z.string().parse(code);

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException("Invalid Access token.");
    }

    const oAuth2Client = await this.getOAuthClient(this.redirectUri);
    const token = await oAuth2Client.getToken(parsedCode);
    // Google oAuth Credentials are stored in token.tokens
    const key = token.tokens;

    oAuth2Client.setCredentials(key);

    const calendar = new calendar_v3.Calendar({
      auth: oAuth2Client,
    });

    const cals = await calendar.calendarList.list({ fields: "items(id,summary,primary,accessRole)" });

    const primaryCal = cals.data.items?.find((cal) => cal.primary);

    if (primaryCal?.id) {
      const alreadyExistingSelectedCalendar = await this.selectedCalendarsRepository.getUserSelectedCalendar(
        ownerId,
        GOOGLE_CALENDAR_TYPE,
        primaryCal.id
      );

      if (alreadyExistingSelectedCalendar) {
        const isCredentialValid = await this.calendarsService.checkCalendarCredentialValidity(
          ownerId,
          alreadyExistingSelectedCalendar.credentialId ?? 0,
          GOOGLE_CALENDAR_TYPE
        );

        // user credential probably got expired in this case
        if (!isCredentialValid) {
          await this.calendarsService.createAndLinkCalendarEntry(
            ownerId,
            alreadyExistingSelectedCalendar.externalId,
            key as Prisma.InputJsonValue,
            GOOGLE_CALENDAR_TYPE,
            alreadyExistingSelectedCalendar.credentialId
          );
        }

        return {
          url: redir || origin,
        };
      }

      await this.calendarsService.createAndLinkCalendarEntry(
        ownerId,
        primaryCal.id,
        key as Prisma.InputJsonValue,
        GOOGLE_CALENDAR_TYPE
      );
    }

    return { url: redir || origin };
  }

  async getEventDetails(userId: number, eventUid: string) {
    const bookingReference =
      await this.bookingReferencesRepository.getBookingReferencesIncludeSensitiveCredentials(eventUid);

    if (!bookingReference) {
      throw new NotFoundException("Booking reference not found");
    }

    const ownerUserEmail = bookingReference?.booking?.user?.email;

    // Get authenticated calendar instance
    const calendar = await this.getAuthorizedCalendarInstance(
      ownerUserEmail,
      bookingReference.credential?.key,
      bookingReference.delegationCredential
    );

    try {
      const event = await calendar.events.get({
        calendarId: bookingReference?.externalCalendarId ?? "primary",
        eventId: bookingReference?.uid,
      });

      if (!event.data) {
        throw new NotFoundException("Meeting not found");
      }

      return {
        eventDetails: event.data,
        rescheduleHistory: event.data.originalStartTime
          ? {
              originalStart: event.data.originalStartTime,
              currentStart: event.data.start,
            }
          : null,
      };
    } catch (error) {
      // this.logger.error(`Failed to get Google Calendar event: ${error.message}`, {
      //   userId,
      //   eventUid,
      //   calendarId: bookingReference?.externalCalendarId,
      // });
      throw new NotFoundException("Failed to retrieve meeting details");
    }
  }

  /**
   * Gets an authorized Google Calendar instance
   * Tries delegation credentials first, falls back to direct OAuth
   */
  async getAuthorizedCalendarInstance(
    userEmail?: string,
    oAuthCredentials?: Prisma.JsonValue | undefined,
    delegationCredential?: { id: string } | null
  ): Promise<calendar_v3.Calendar> {
    if (userEmail && delegationCredential?.id) {
      const delegatedCalendar = await this.getDelegatedCalendarInstance(delegationCredential, userEmail);
      if (delegatedCalendar) {
        return delegatedCalendar;
      }
    }

    // Fall back to direct OAuth authentication
    if (!oAuthCredentials) {
      throw new UnauthorizedException("No valid credentials available for Google Calendar");
    }
    const parsedOAuthCredentials = OAuth2UniversalSchema.parse(oAuthCredentials);
    const oAuth2Client = await this.getOAuthClient(this.redirectUri);
    oAuth2Client.setCredentials(parsedOAuthCredentials);

    return new calendar_v3.Calendar({ auth: oAuth2Client });
  }

  async getDelegatedCalendarInstance(
    delegationCredential: { id: string },
    emailToImpersonate: string
  ): Promise<calendar_v3.Calendar | null> {
    try {
      const oauthClientIdAliasRegex = /\+[a-zA-Z0-9]{25}/;
      const cleanEmail = emailToImpersonate.replace(oauthClientIdAliasRegex, "");

      const serviceAccountCreds =
        await DelegationCredentialRepository.findByIdIncludeSensitiveServiceAccountKey({
          id: delegationCredential.id,
        });

      if (
        !serviceAccountCreds?.serviceAccountKey?.client_email ||
        !serviceAccountCreds?.serviceAccountKey?.private_key
      ) {
        this.logger.error("Missing service account credentials for delegation", {
          delegationCredentialId: delegationCredential.id,
        });
        return null;
      }

      const authClient = new JWT({
        email: serviceAccountCreds.serviceAccountKey.client_email,
        key: serviceAccountCreds.serviceAccountKey.private_key,
        scopes: ["https://www.googleapis.com/auth/calendar"],
        subject: cleanEmail,
      });

      await authClient.authorize();
      return new calendar_v3.Calendar({ auth: authClient });
    } catch (error) {
      // this.logger.error(`Failed to get delegated calendar: ${error.message}`, {
      //   delegationId: delegationCredential.id,
      //   email: emailToImpersonate
      // });
      return null;
    }
  }
}
