import type { CredentialForCalendarService } from "@calcom/types/Credential";

import { tasker } from "../../../tasker";

interface HandleAnalyticsEventsProps {
  credentials: CredentialForCalendarService[];
  rawBookingData: Record<string, any>;
  bookingInfo: {
    email: string;
    name: string;
    eventName: string;
  };
  isTeamEventType: boolean;
}

export const handleAnalyticsEvents = async ({
  credentials,
  rawBookingData,
  bookingInfo,
  isTeamEventType,
}: HandleAnalyticsEventsProps) => {
  const { dub_id } = await rawBookingData;

  if (!dub_id || typeof dub_id !== "string") return;

  const dubCredential = credentials.find((cred) => {
    if (cred.appId !== "dub") return false;
    if (isTeamEventType && !cred.teamId) return false;
    return true;
  });

  if (!dubCredential) return;

  try {
    await tasker.create("sendAnalyticsEvent", {
      credentialId: dubCredential.id,
      info: {
        id: dub_id,
        ...bookingInfo,
      },
    });
  } catch (err) {
    console.error("Error sending dub lead: ", err);
  }
};
