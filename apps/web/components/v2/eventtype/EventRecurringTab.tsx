import { EventTypeSetupInfered } from "pages/v2/event-types/[type]";
import { useState } from "react";

import { getEventTypeAppData } from "@calcom/app-store/utils";

import RecurringEventController from "./RecurringEventController";

export const EventRecurringTab = ({
  eventType,
  hasPaymentIntegration,
}: Pick<EventTypeSetupInfered, "eventType" | "hasPaymentIntegration">) => {
  const stripeAppData = getEventTypeAppData(eventType, "stripe");
  const requirePayment = stripeAppData.price > 0;
  const [recurringEventDefined, setRecurringEventDefined] = useState(
    eventType.recurringEvent?.count !== undefined
  );

  return (
    <div className="">
      <RecurringEventController
        paymentEnabled={hasPaymentIntegration && requirePayment}
        onRecurringEventDefined={setRecurringEventDefined}
        recurringEvent={eventType.recurringEvent}
      />
    </div>
  );
};
