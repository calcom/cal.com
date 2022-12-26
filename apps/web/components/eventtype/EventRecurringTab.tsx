import { EventTypeSetupProps } from "pages/event-types/[type]";

import getStripeAppData from "@calcom/lib/getStripeAppData";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const stripeAppData = getStripeAppData(eventType);

  const requirePayment = stripeAppData.price > 0;

  return (
    <div className="">
      <RecurringEventController paymentEnabled={requirePayment} recurringEvent={eventType.recurringEvent} />
    </div>
  );
};
