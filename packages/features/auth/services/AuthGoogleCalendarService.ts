import { calendar_v3 } from "@googleapis/calendar";
import { OAuth2Client } from "googleapis-common";
import type { Account } from "next-auth";

import { updateProfilePhotoGoogle } from "@calcom/app-store/_utils/oauth/updateProfilePhotoGoogle";
import { createGoogleCalendarServiceWithGoogleType } from "@calcom/app-store/googlecalendar/lib/CalendarService";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { buildCredentialCreateData as BuildCredentialCreateDataFn } from "@calcom/features/credentials/services/CredentialDataService";
import { GOOGLE_CALENDAR_SCOPES } from "@calcom/lib/constants";
import type { AppLogger } from "@calcom/lib/logger";

const GOOGLE_API_CREDENTIALS = process.env.GOOGLE_API_CREDENTIALS || "{}";
const { client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET } =
  JSON.parse(GOOGLE_API_CREDENTIALS)?.web || {};

export interface IAuthGoogleCalendarServiceDeps {
  credentialRepository: Pick<
    typeof CredentialRepository,
    "findFirstByAppIdAndUserId" | "findFirstByUserIdAndType" | "create"
  >;
  buildCredentialCreateData: typeof BuildCredentialCreateDataFn;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
}

export class AuthGoogleCalendarService {
  constructor(private readonly deps: IAuthGoogleCalendarServiceDeps) {}

  async autoInstallIfEligible(params: {
    userId: number;
    account: Account;
    grantedScopes: string[];
  }): Promise<void> {
    const { userId, account, grantedScopes } = params;

    if (account.provider !== "google") return;

    const hasExistingCredential = await this.deps.credentialRepository.findFirstByAppIdAndUserId({
      userId,
      appId: "google-calendar",
    });
    if (hasExistingCredential) return;

    if (!GOOGLE_CALENDAR_SCOPES.every((scope) => grantedScopes.includes(scope))) return;

    const credentialKey = {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      id_token: account.id_token,
      token_type: account.token_type,
      expires_at: account.expires_at,
    };

    const gcalCredentialData = this.deps.buildCredentialCreateData({
      userId,
      key: credentialKey,
      appId: "google-calendar",
      type: "google_calendar",
    });

    const gcalCredential = await this.deps.credentialRepository.create(gcalCredentialData);

    const gCalService = createGoogleCalendarServiceWithGoogleType({
      ...gcalCredential,
      user: null,
      delegatedTo: null,
    });

    const hasGoogleMeet = await this.deps.credentialRepository.findFirstByUserIdAndType({
      userId,
      type: "google_video",
    });
    if (!hasGoogleMeet) {
      const googleMeetCredentialData = this.deps.buildCredentialCreateData({
        type: "google_video",
        key: {},
        userId,
        appId: "google-meet",
      });
      await this.deps.credentialRepository.create(googleMeetCredentialData);
    }

    const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oAuth2Client.setCredentials(credentialKey);
    const calendar = new calendar_v3.Calendar({ auth: oAuth2Client });
    const primaryCal = await gCalService.getPrimaryCalendar(calendar);
    if (primaryCal?.id) {
      await gCalService.createSelectedCalendar({
        externalId: primaryCal.id,
        userId,
      });
    }

    await updateProfilePhotoGoogle(oAuth2Client, userId);
  }
}
