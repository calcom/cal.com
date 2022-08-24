import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import RecurringEventController from "@components/v2/eventtype/RecurringEventController";

export const EventRecurringTab = ({
  eventType,
  hasPaymentIntegration,
}: Pick<EventTypeSetupInfered, "eventType" | "hasPaymentIntegration">) => {
  const formMethods = useFormContext<FormValues>();
  const requirePayment = eventType.price > 0;
  const [recurringEventDefined, setRecurringEventDefined] = useState(
    eventType.recurringEvent?.count !== undefined
  );

  return (
    <div className="">
      <RecurringEventController
        paymentEnabled={hasPaymentIntegration && requirePayment}
        onRecurringEventDefined={setRecurringEventDefined}
        recurringEvent={eventType.recurringEvent}
        formMethods={formMethods}
      />
    </div>
  );
};
