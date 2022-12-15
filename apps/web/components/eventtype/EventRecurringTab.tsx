import { EventTypeSetupInfered } from "pages/event-types/[type]";
import { useState } from "react";

import getStripeAppData from "@calcom/lib/getStripeAppData";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({ eventType }: Pick<EventTypeSetupInfered, "eventType">) => {
  const stripeAppData = getStripeAppData(eventType);

  const requirePayment = stripeAppData.price > 0;

  return (
    <div className="">
      <RecurringEventController paymentEnabled={requirePayment} recurringEvent={eventType.recurringEvent} />
    </div>
  );
};
