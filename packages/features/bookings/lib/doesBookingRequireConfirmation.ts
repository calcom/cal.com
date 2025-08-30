import type { z } from "zod";

import dayjs from "@calcom/dayjs";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

/**
 * Determines if a booking actually requires confirmation(considering requiresConfirmationThreshold)
 */
export const doesBookingRequireConfirmation = ({
  booking: { startTime, eventType },
}: {
  booking: {
    startTime: Date;
    eventType: {
      requiresConfirmation?: boolean;
      metadata: z.infer<typeof EventTypeMetaDataSchema>;
    } | null;
  };
}) => {
  let requiresConfirmation = eventType?.requiresConfirmation;
  const rcThreshold = eventType?.metadata?.requiresConfirmationThreshold;
  if (rcThreshold) {
    // Convert startTime to UTC and create Day.js instances
    const startTimeUTC = dayjs(startTime).utc();
    const currentTime = dayjs();

    // Calculate the time difference in the specified unit
    const timeDifference = startTimeUTC.diff(currentTime, rcThreshold.unit);

    // Check if the time difference exceeds the threshold
    if (timeDifference > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }
  return requiresConfirmation;
};
