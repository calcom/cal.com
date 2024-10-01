import type { EventRecurringWebWrapperProps } from "@calcom/atoms/event-types/wrappers/EventRecurringWebWrapper";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType }: EventRecurringWebWrapperProps) => {
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  return <RecurringEventController paymentEnabled={requirePayment} eventType={eventType} />;
};
