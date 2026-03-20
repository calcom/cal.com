import type { Account } from "next-auth";

interface OfficeCalendar {
  id?: string;
  isDefaultCalendar?: boolean;
}

import { updateProfilePhotoMicrosoft } from "@calcom/app-store/_utils/oauth/updateProfilePhotoMicrosoft";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { buildCredentialCreateData as BuildCredentialCreateDataFn } from "@calcom/features/credentials/services/CredentialDataService";
import { handleErrorsJson } from "@calcom/lib/errors";
import type { AppLogger } from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";

export interface IAuthOutlookCalendarServiceDeps {
  credentialRepository: Pick<
    typeof CredentialRepository,
    "findFirstByAppIdAndUserId" | "findFirstByUserIdAndType" | "create"
  >;
  buildCredentialCreateData: typeof BuildCredentialCreateDataFn;
  prisma: PrismaClient;
  log: Pick<AppLogger, "debug" | "warn" | "error" | "info">;
}

export class AuthOutlookCalendarService {
  constructor(private readonly deps: IAuthOutlookCalendarServiceDeps) {}

  async autoInstallIfEligible(params: {
    userId: number;
    account: Account;
    grantedScopes: string[];
  }): Promise<void> {
    const { userId, account } = params;

    if (account.provider !== "azure-ad") return;

    const hasExistingCredential = await this.deps.credentialRepository.findFirstByAppIdAndUserId({
      userId,
      appId: "office365-calendar",
    });
    if (hasExistingCredential) return;

    const credentialKey = {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      token_type: account.token_type,
      expires_at: account.expires_at,
      expiry_date: account.expires_at,
    };

    const outlookCredentialData = this.deps.buildCredentialCreateData({
      userId,
      key: credentialKey,
      appId: "office365-calendar",
      type: "office365_calendar",
    });

    const credential = await this.deps.credentialRepository.create(outlookCredentialData);

    const defaultCalendar = await this.findDefaultCalendar(account.access_token as string);

    if (defaultCalendar?.id) {
      try {
        await this.deps.prisma.selectedCalendar.create({
          data: {
            userId,
            integration: "office365_calendar",
            externalId: defaultCalendar.id,
            credentialId: credential.id,
          },
        });
      } catch (error) {
        this.deps.log.warn("Failed to create selected calendar for Office 365", { error, userId });
      }
    }

    const hasMsTeams = await this.deps.credentialRepository.findFirstByUserIdAndType({
      userId,
      type: "office365_video",
    });
    if (!hasMsTeams) {
      const msTeamsCredentialData = this.deps.buildCredentialCreateData({
        type: "office365_video",
        key: {},
        userId,
        appId: "msteams",
      });
      await this.deps.credentialRepository.create(msTeamsCredentialData);
    }

    await updateProfilePhotoMicrosoft(account.access_token as string, userId);
  }

  private async findDefaultCalendar(accessToken: string): Promise<OfficeCalendar | undefined> {
    let requestUrl = "https://graph.microsoft.com/v1.0/me/calendars?$select=id,isDefaultCalendar";
    let finishedParsingCalendars = false;

    while (!finishedParsingCalendars) {
      const calRequest = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!calRequest.ok) {
        this.deps.log.warn("Failed to fetch Office 365 calendars", {
          status: calRequest.status,
          statusText: calRequest.statusText,
        });
        return undefined;
      }

      const calBody = await handleErrorsJson<{
        value: OfficeCalendar[];
        "@odata.nextLink"?: string;
      }>(calRequest);

      const defaultCal = (calBody.value ?? []).find((calendar) => calendar.isDefaultCalendar);
      if (defaultCal) return defaultCal;

      if (calBody["@odata.nextLink"]) {
        requestUrl = calBody["@odata.nextLink"];
      } else {
        finishedParsingCalendars = true;
      }
    }

    return undefined;
  }
}
