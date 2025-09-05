export const shouldChargeNoShowCancellationFee = ({
  eventTypeMetadata,
  booking,
  payment,
}: {
  eventTypeMetadata: any;
  booking: {
    startTime: Date;
  };
  payment: {
    appId: string;
  };
}) => {
  const paymentAppId = payment.appId;
  console.log("paymentAppId", paymentAppId);

  const cancellationFeeEnabled = eventTypeMetadata?.apps?.[paymentAppId]?.autoChargeNoShowFeeIfCancelled;
  console.log("cancellationFeeEnabled", cancellationFeeEnabled);
  const paymentOption = eventTypeMetadata?.apps?.[paymentAppId]?.paymentOption;
  const timeValue = eventTypeMetadata?.apps?.[paymentAppId]?.autoChargeNoShowFeeTimeValue;
  const timeUnit = eventTypeMetadata?.apps?.[paymentAppId]?.autoChargeNoShowFeeTimeUnit;

  if (!cancellationFeeEnabled || paymentOption !== "HOLD" || !booking?.startTime) {
    return false;
  }

  if (!timeValue || !timeUnit) {
    return false;
  }

  const now = new Date();
  const startTime = new Date(booking.startTime);
  const threshold = new Date(startTime);

  switch (timeUnit) {
    case "minutes":
      threshold.setMinutes(threshold.getMinutes() - timeValue);
      break;
    case "hours":
      threshold.setHours(threshold.getHours() - timeValue);
      break;
    case "days":
      threshold.setDate(threshold.getDate() - timeValue);
      break;
  }

  return now >= threshold;
};
