import process from "node:process";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

const log = logger.getSubLogger({ prefix: ["[lyra]"] });

const LYRA_API_URL = process.env.LYRA_API_URL || "https://app.lyra.so";

const LyraVideoApiAdapter = (credential: CredentialPayload): VideoApiAdapter => {
  // Decrypt API key from credential
  let apiKey: string;
  try {
    const decrypted = symmetricDecrypt(
      (credential.key as { encrypted: string }).encrypted,
      process.env.CALENDSO_ENCRYPTION_KEY || ""
    );
    const parsed = JSON.parse(decrypted);
    apiKey = parsed.api_key;
  } catch (error) {
    log.error("Failed to decrypt Lyra API key", error);
    throw new Error("Invalid Lyra credentials");
  }

  return {
    getAvailability: async () => {
      return [];
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      log.debug("Creating Lyra meeting", { title: event.title });

      const response = await fetch(`${LYRA_API_URL}/api/v1/meeting`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          title: event.title,
          start: event.startTime,
          attendees: event.attendees.map((attendee) => attendee.email),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        log.error("Failed to create Lyra meeting", { status: response.status, error });
        throw new Error(`Failed to create Lyra meeting: ${error}`);
      }

      const data = await response.json();
      log.debug("Lyra meeting created", { id: data.id, url: data.url });

      return {
        type: "lyra_video",
        id: data.id,
        password: data.password || "",
        url: data.url,
      };
    },
    deleteMeeting: async (uid: string): Promise<void> => {
      // No-op - Lyra handles meeting lifecycle independently
      log.debug("Delete meeting called (no-op)", { uid });
    },
    updateMeeting: async (bookingRef: PartialReference, _event: CalendarEvent): Promise<VideoCallData> => {
      // No-op - return existing data
      log.debug("Update meeting called (no-op)", { uid: bookingRef.uid });
      return {
        type: "lyra_video",
        id: bookingRef.meetingId as string,
        password: bookingRef.meetingPassword as string,
        url: bookingRef.meetingUrl as string,
      };
    },
  };
};

export default LyraVideoApiAdapter;
