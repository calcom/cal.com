import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";

import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import { metadata } from "../_metadata";
import { appKeysSchema } from "../zod";

const buildChecksum = (callName: string, query: string, sharedSecret: string) =>
  createHash("sha1").update(`${callName}${query}${sharedSecret}`).digest("hex");

const getXmlTag = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
  return match?.[1] ?? "";
};

const buildApiUrl = ({
  serverUrl,
  callName,
  params,
  sharedSecret,
}: {
  serverUrl: string;
  callName: string;
  params: URLSearchParams;
  sharedSecret: string;
}) => {
  const query = params.toString();
  const checksum = buildChecksum(callName, query, sharedSecret);
  const normalizedServerUrl = serverUrl.replace(/\/+$/, "");
  return `${normalizedServerUrl}/bigbluebutton/api/${callName}?${query}&checksum=${checksum}`;
};

const buildMeetingId = (eventData: CalendarEvent, pattern: string) =>
  pattern
    .replaceAll("{uuid}", uuidv4())
    .replaceAll("{Title}", eventData.title)
    .replaceAll("{Event Type Title}", eventData.type)
    .replaceAll("{Scheduler}", eventData.attendees.map((a) => a.name).join("-"))
    .replaceAll("{Organizer}", eventData.organizer.name)
    .replaceAll("{Location}", eventData.location || "")
    .replaceAll("{Team}", eventData.team?.name || "")
    .replaceAll(" ", "-");

const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => ({
  getAvailability: () => Promise.resolve([]),

  createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
    const { bigBlueButtonServerUrl, bigBlueButtonSharedSecret, bigBlueButtonMeetingPattern } =
      await getParsedAppKeysFromSlug(metadata.slug, appKeysSchema);

    const meetingID = buildMeetingId(eventData, bigBlueButtonMeetingPattern || "cal-{uuid}");
    const attendeePW = uuidv4();
    const moderatorPW = uuidv4();

    const createParams = new URLSearchParams({
      name: eventData.title,
      meetingID,
      attendeePW,
      moderatorPW,
    });

    const createUrl = buildApiUrl({
      serverUrl: bigBlueButtonServerUrl,
      callName: "create",
      params: createParams,
      sharedSecret: bigBlueButtonSharedSecret,
    });

    const createResponse = await fetch(createUrl);
    const createXml = await createResponse.text();
    const returnCode = getXmlTag(createXml, "returncode");

    if (!createResponse.ok || returnCode !== "SUCCESS") {
      const message = getXmlTag(createXml, "message") || "Unable to create BigBlueButton meeting";
      throw new Error(message);
    }

    const joinParams = new URLSearchParams({
      fullName: "Guest",
      meetingID,
      password: attendeePW,
    });

    const joinUrl = buildApiUrl({
      serverUrl: bigBlueButtonServerUrl,
      callName: "join",
      params: joinParams,
      sharedSecret: bigBlueButtonSharedSecret,
    });

    return {
      type: metadata.type,
      id: `${meetingID}:${moderatorPW}`,
      password: moderatorPW,
      url: joinUrl,
    };
  },

  deleteMeeting: async (uid: string): Promise<void> => {
    const [meetingID, moderatorPW] = uid.split(":");
    if (!meetingID || !moderatorPW) {
      return;
    }

    const { bigBlueButtonServerUrl, bigBlueButtonSharedSecret } = await getParsedAppKeysFromSlug(
      metadata.slug,
      appKeysSchema
    );

    const endParams = new URLSearchParams({
      meetingID,
      password: moderatorPW,
    });

    const endUrl = buildApiUrl({
      serverUrl: bigBlueButtonServerUrl,
      callName: "end",
      params: endParams,
      sharedSecret: bigBlueButtonSharedSecret,
    });

    const endResponse = await fetch(endUrl);
    const endXml = await endResponse.text();
    const returnCode = getXmlTag(endXml, "returncode");

    if (!endResponse.ok || returnCode !== "SUCCESS") {
      const message = getXmlTag(endXml, "message") || "Unable to end BigBlueButton meeting";
      throw new Error(message);
    }
  },

  updateMeeting: (bookingRef: PartialReference): Promise<VideoCallData> =>
    Promise.resolve({
      type: metadata.type,
      id: bookingRef.meetingId as string,
      password: bookingRef.meetingPassword as string,
      url: bookingRef.meetingUrl as string,
    }),
});

export default BigBlueButtonVideoApiAdapter;
