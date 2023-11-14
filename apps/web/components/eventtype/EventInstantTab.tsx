import type { EventTypeSetupProps } from "pages/event-types/[type]";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import InstantEventController from "./InstantEventController";

export const EventInstantTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  return (
    <div>
      <InstantEventController paymentEnabled={requirePayment} eventType={eventType} />
    </div>
  );
};
