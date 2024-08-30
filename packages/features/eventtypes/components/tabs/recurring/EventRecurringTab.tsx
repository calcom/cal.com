import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  return <RecurringEventController paymentEnabled={requirePayment} eventType={eventType} />;
};
