import type { z } from "zod";

import dayjs from "@calcom/dayjs";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

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
    if (dayjs(dayjs(startTime).utc().format()).diff(dayjs(), rcThreshold.unit) > rcThreshold.time) {
      requiresConfirmation = false;
    }
  }
  return requiresConfirmation;
};
