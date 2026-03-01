import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
function generateBBBChecksum(apiCall: string, queryString: string, secret: string): string {
  const stringToHash = apiCall + queryString + secret;
  return crypto.createHash("sha1").update(stringToHash).digest("hex");
}
function buildBBBUrl(
  host: string,
  apiCall: string,
  params: Record<string, string>,
  secret: string
): string {
  const queryString = new URLSearchParams(params).toString();
  const checksum = generateBBBChecksum(apiCall, queryString, secret);
  return `${host}/bigbluebutton/api/${apiCall}?${queryString}&checksum=${checksum}`;
}
const BigBlueButtonVideoApiAdapter = (): VideoApiAdapter => {
  return {
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (eventData: CalendarEvent): Promise<VideoCallData> => {
      const appKeys = await getAppKeysFromSlug(metadata.slug);
      const host = (appKeys.bbbHost as string) || "https://test.bigbluebutton.org";
      const secret = (appKeys.bbbSecret as string) || "";
      const meetingID = `cal-${uuidv4()}`;
      const moderatorPW = crypto.randomBytes(8).toString("hex");
      const attendeePW = crypto.randomBytes(8).toString("hex");
      const createParams: Record<string, string> = {
        name: eventData.title || "Cal.com Meeting",
        meetingID: meetingID,
        moderatorPW: moderatorPW,
        attendeePW: attendeePW,
        welcome: "Welcome to this Cal.com meeting powered by BigBlueButton!",
        record: "true",
        autoStartRecording: "false",allowStartStopRecording: "true",
};
