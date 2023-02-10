import { EventTypeSetupProps } from "pages/event-types/[type]";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  return (
    <div className="">
      <RecurringEventController paymentEnabled={requirePayment} recurringEvent={eventType.recurringEvent} />
    </div>
  );
};
