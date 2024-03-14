import type { EventTypeSetupProps } from "pages/event-types/[type]";

import getPaymentAppData from "@calcom/lib/getPaymentAppData";

import AIEventController from "./AIEventController";

export const EventAITab = ({
  eventType,
  isTeamEvent,
}: Pick<EventTypeSetupProps, "eventType"> & { isTeamEvent: boolean }) => {
  const paymentAppData = getPaymentAppData(eventType);

  const requirePayment = paymentAppData.price > 0;

  return (
    <AIEventController paymentEnabled={requirePayment} eventType={eventType} isTeamEvent={isTeamEvent} />
  );
};
