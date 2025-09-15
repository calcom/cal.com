import type { z } from "zod";

import type { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";

export const shouldChargeNoShowCancellationFee = ({
  eventTypeMetadata,
  booking,
  payment,
}: {
  eventTypeMetadata: z.infer<typeof eventTypeMetaDataSchemaWithTypedApps>;
  booking: {
    startTime: Date;
  };
  payment: {
    appId?: string | null;
  };
}) => {
  const paymentAppId = payment?.appId;

  if (typeof paymentAppId !== "string") {
    return false;
  }

  const cancellationFeeEnabled =
    eventTypeMetadata?.apps?.[paymentAppId as keyof typeof eventTypeMetadata.apps]
      ?.autoChargeNoShowFeeIfCancelled;
  const paymentOption =
    eventTypeMetadata?.apps?.[paymentAppId as keyof typeof eventTypeMetadata.apps]?.paymentOption;
  const timeValue =
    eventTypeMetadata?.apps?.[paymentAppId as keyof typeof eventTypeMetadata.apps]
      ?.autoChargeNoShowFeeTimeValue;
  const timeUnit =
    eventTypeMetadata?.apps?.[paymentAppId as keyof typeof eventTypeMetadata.apps]
      ?.autoChargeNoShowFeeTimeUnit;

  if (!cancellationFeeEnabled || paymentOption !== "HOLD" || !booking?.startTime) {
    return false;
  }

  if (!timeValue || !timeUnit) {
    return false;
  }

  const multiplier: { [key: string]: number } = {
    minutes: 1,
    hours: 60,
    days: 1440,
  };
  const timeInMinutes = timeValue * multiplier[timeUnit];

  const now = new Date();
  const startTime = new Date(booking.startTime);
  const threshold = new Date(startTime);

  threshold.setMinutes(threshold.getMinutes() - timeInMinutes);

  return now >= threshold;
};
