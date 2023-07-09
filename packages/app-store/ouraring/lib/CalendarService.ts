import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { handleErrorsJson } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type {
  Calendar,
  EventBusyDate,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

export type OuraRingAuthCredentials = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type OuraRingReturnedData = {
  day: string;
  score: number;
};

const toUrlEncoded = (payload: Record<string, string>) =>
  Object.keys(payload)
    .map((key) => key + "=" + encodeURIComponent(payload[key]))
    .join("&");

const ouraRingAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

export const getOuraRingAppKeys = async () => {
  return getParsedAppKeysFromSlug("ouraring", ouraRingAppKeysSchema);
};

const refreshTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z
    .number()
    .transform((currentTimeOffsetInSeconds) => Math.round(+new Date() / 1000 + currentTimeOffsetInSeconds)),
  refresh_token: z.string().optional(),
});

export default class OuraRingCalendarService implements Calendar {
  private integrationName = "";
  private log: typeof logger;
  private accessToken: string | null = null;
  auth: { getToken: () => Promise<string> };
  private apiUrl = "https://api.ouraring.com/v2";

  constructor(credential: CredentialPayload) {
    this.integrationName = "oura_ring_other_calendar";
    this.auth = this.ouraRingAuth(credential);
    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  createEvent(): Promise<NewCalendarEventType | undefined> {
    return Promise.resolve(undefined);
  }
  updateEvent(): Promise<NewCalendarEventType | NewCalendarEventType[]> {
    return Promise.resolve([]);
  }
  deleteEvent(): Promise<unknown> {
    return Promise.resolve();
  }

  async getAvailability(dateFrom: string, dateTo: string): Promise<EventBusyDate[]> {
    try {
      const response = await this.fetcher(
        `/usercollection/daily_readiness?${toUrlEncoded({
          start_date: dayjs(dateFrom).format("YYYY-MM-DD"),
          end_date: dayjs(dateTo).format("YYYY-MM-DD"),
        })}`
      );

      if (!response.ok) {
        return Promise.reject([]);
      }

      const ouraInfo = (await response.json()) as { data: OuraRingReturnedData[] };

      if (ouraInfo.data.length > 0) {
        const result = ouraInfo.data.flatMap((data: OuraRingReturnedData) => {
          if (data.score < 70) {
            return [
              {
                start: dayjs(data.day).startOf("day").toISOString(),
                end: dayjs(data.day).endOf("day").toISOString(),
                source: "Oura Ring",
              },
            ];
          }
          return [];
        });
        return Promise.resolve(result);
      } else {
        this.log.debug("No data returned");
      }

      return Promise.resolve([]);
    } catch (err) {
      this.log.error(err);
      return Promise.reject([]);
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    return Promise.resolve([]);
  }

  private ouraRingAuth = (credential: CredentialPayload) => {
    const isExpired = (expiryDate: number) => {
      if (!expiryDate) {
        return true;
      } else {
        return expiryDate < Math.round(+new Date() / 1000);
      }
    };
    const ouraRingCredentials = credential.key as OuraRingAuthCredentials;

    const refreshAccessToken = async (ouraRingCredentials: OuraRingAuthCredentials) => {
      const { client_id, client_secret } = await getOuraRingAppKeys();
      const response = await fetch("https://cloud.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: toUrlEncoded({
          client_id,
          refresh_token: ouraRingCredentials.refresh_token,
          grant_type: "refresh_token",
          client_secret,
        }),
      });
      const responseJson = await handleErrorsJson(response);
      const tokenResponse = refreshTokenResponseSchema.safeParse(responseJson);
      ouraRingCredentials = { ...ouraRingCredentials, ...(tokenResponse.success && tokenResponse.data) };
      if (!tokenResponse.success) {
        this.log.error(
          "Oura Ring error grabbing new tokens ~ zodError:",
          tokenResponse.error,
          "API response:",
          responseJson
        );
      }
      await prisma.credential.update({
        where: {
          id: credential.id,
        },
        data: {
          key: ouraRingCredentials,
        },
      });
      return ouraRingCredentials.access_token;
    };

    return {
      getToken: () =>
        isExpired(ouraRingCredentials.expires_in)
          ? refreshAccessToken(ouraRingCredentials)
          : Promise.resolve(ouraRingCredentials.access_token),
    };
  };

  private fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
    this.accessToken = await this.auth.getToken();
    return fetch(`${this.apiUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + this.accessToken,
        "Content-Type": "application/json",
      },
      ...init,
    });
  };
}
