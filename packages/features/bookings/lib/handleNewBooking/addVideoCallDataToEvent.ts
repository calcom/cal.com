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
