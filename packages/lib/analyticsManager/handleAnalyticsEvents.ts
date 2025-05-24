import tasker from "@calcom/features/tasker";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

interface HandleAnalyticsEventsProps {
  credentials: CredentialForCalendarService[];
  rawBookingData: Record<string, any>;
  bookingInfo: {
    email: string;
    name: string;
    eventName: string;
  };
}

export const handleAnalyticsEvents = async ({
  credentials,
  rawBookingData,
  bookingInfo,
}: HandleAnalyticsEventsProps) => {
  const { dub_id } = await rawBookingData;

  if (!dub_id || typeof dub_id !== "string") return;

  const dubCredential = credentials.find((cred) => cred.appId === "dub");

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
