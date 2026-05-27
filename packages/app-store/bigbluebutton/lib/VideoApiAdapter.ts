import { createHash, randomUUID } from "node:crypto";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import { appKeysSchema } from "../zod";

type BigBlueButtonKeys = {
  bigBlueButtonServerUrl: string;
  bigBlueButtonSharedSecret: string;
};

const ATTENDEE_PASSWORD = "attendee";
const MODERATOR_PASSWORD = "moderator";

/**
 * Reads and validates the configured BigBlueButton server URL and shared secret.
 */
const getBigBlueButtonKeys = async (): Promise<BigBlueButtonKeys> =>
  appKeysSchema.parse(await getAppKeysFromSlug(metadata.slug));

/**
 * Ensures a configured BigBlueButton host points at its API endpoint.
 */
const normalizeServerUrl = (serverUrl: string): URL => {
  const url = new URL(serverUrl);

  if (!url.pathname.endsWith("/api/")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/api/`;
  }

  return url;
};

/**
 * Builds the SHA-1 checksum required by BigBlueButton API calls.
 */
const createChecksum = (callName: string, query: string, sharedSecret: string): string =>
  createHash("sha1").update(`${callName}${query}${sharedSecret}`).digest("hex");

/**
 * Creates a signed BigBlueButton API URL for the given call and parameters.
 */
const createApiUrl = ({
  callName,
  params,
  serverUrl,
  sharedSecret,
}: {
  callName: string;
  params: Record<string, string>;
  serverUrl: string;
  sharedSecret: string;
}): string => {
  const apiUrl = normalizeServerUrl(serverUrl);
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();
  searchParams.set("checksum", createChecksum(callName, query, sharedSecret));
  apiUrl.pathname = `${apiUrl.pathname}${callName}`;
  apiUrl.search = searchParams.toString();

  return apiUrl.toString();
};

/**
 * Calls BigBlueButton and treats non-success API responses as failures.
 */
const callBigBlueButtonApi = async (url: string): Promise<void> => {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok || !body.includes("<returncode>SUCCESS</returncode>")) {
    throw new Error("BigBlueButton API request failed");
  }
};

/**
 * Reuses an existing booking reference when updating or creates a stable booking meeting id.
 */
const getMeetingId = (eventData: CalendarEvent, bookingRef?: PartialReference): string =>
  String(bookingRef?.meetingId || eventData.uid || randomUUID());

/**
 * Creates the Cal.com video adapter used to manage BigBlueButton meetings.
 */
const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  /**
   * Creates or updates a BigBlueButton meeting and returns the attendee join link.
   */
  const createOrUpdateMeeting = async (
    eventData: CalendarEvent,
    bookingRef?: PartialReference
  ): Promise<VideoCallData> => {
    const { bigBlueButtonServerUrl, bigBlueButtonSharedSecret } = await getBigBlueButtonKeys();
    const meetingID = getMeetingId(eventData, bookingRef);

    await callBigBlueButtonApi(
      createApiUrl({
        callName: "create",
        serverUrl: bigBlueButtonServerUrl,
        sharedSecret: bigBlueButtonSharedSecret,
        params: {
          name: eventData.title,
          meetingID,
          attendeePW: ATTENDEE_PASSWORD,
          moderatorPW: MODERATOR_PASSWORD,
          logoutURL: WEBAPP_URL,
        },
      })
    );

    return {
      type: metadata.type,
      id: meetingID,
      password: ATTENDEE_PASSWORD,
      url: createApiUrl({
        callName: "join",
        serverUrl: bigBlueButtonServerUrl,
        sharedSecret: bigBlueButtonSharedSecret,
        params: {
          fullName: eventData.attendees[0]?.name || "Guest",
          meetingID,
          password: ATTENDEE_PASSWORD,
          redirect: "true",
        },
      }),
    };
  };

  return {
    getAvailability: () => Promise.resolve([]),
    createMeeting: createOrUpdateMeeting,
    updateMeeting: (bookingRef: PartialReference, eventData: CalendarEvent): Promise<VideoCallData> =>
      createOrUpdateMeeting(eventData, bookingRef),
    deleteMeeting: async (meetingID: string): Promise<void> => {
      const { bigBlueButtonServerUrl, bigBlueButtonSharedSecret } = await getBigBlueButtonKeys();

      await callBigBlueButtonApi(
        createApiUrl({
          callName: "end",
          serverUrl: bigBlueButtonServerUrl,
          sharedSecret: bigBlueButtonSharedSecret,
          params: {
            meetingID,
            password: MODERATOR_PASSWORD,
          },
        })
      );
    },
  };
};

export const testHelpers: {
  createApiUrl: typeof createApiUrl;
  createChecksum: typeof createChecksum;
  normalizeServerUrl: typeof normalizeServerUrl;
} = {
  createApiUrl,
  createChecksum,
  normalizeServerUrl,
};

export default BigBlueButtonVideoApiAdapter;
