import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

import type { RecurringEventControllerProps } from "./RecurringEventController";
import RecurringEventController from "./RecurringEventController";

export type EventRecurringTabProps = Omit<RecurringEventControllerProps, "paymentEnabled">;

export const EventRecurringTab = ({ eventType, customClassNames }: EventRecurringTabProps) => {
  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });

  const requirePayment = paymentAppData.price > 0;

  return (
    <RecurringEventController
      paymentEnabled={requirePayment}
      eventType={eventType}
      customClassNames={customClassNames}
    />
  );
};
