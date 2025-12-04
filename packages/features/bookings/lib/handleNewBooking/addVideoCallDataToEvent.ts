import { getPublicVideoCallUrl } from "@calcom/lib/CalEventParser";
import type { BookingReference } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

/** Updates the evt object with video call data found from booking references
 *
 * @param bookingReferences
 * @param evt
 *
 * @returns updated evt with video call data
 */
export const addVideoCallDataToEvent = (bookingReferences: BookingReference[], evt: CalendarEvent) => {
  const videoCallReference = bookingReferences.find((reference) => reference.type.includes("_video"));

  if (videoCallReference) {
    // For daily_video (Cal Video), use the public Cal.com video URL instead of the raw Daily URL
    // This ensures webhook payloads show the cal.com video link (e.g., https://app.cal.com/video/...)
    // instead of the internal Daily video URL (e.g., https://meetco.daily.co/...)
    const isDailyVideo = videoCallReference.type === "daily_video";
    const videoCallUrl = isDailyVideo && evt.uid ? getPublicVideoCallUrl(evt) : videoCallReference.meetingUrl;

    evt.videoCallData = {
      type: videoCallReference.type,
      id: videoCallReference.meetingId,
      password: videoCallReference?.meetingPassword,
      url: videoCallUrl,
    };
  }

  return evt;
};
