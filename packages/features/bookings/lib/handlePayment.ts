import { PaymentServiceMap } from "@calcom/app-store/payment.services.generated";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import type { AppCategories, Prisma, EventType } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const isPaymentService = (x: unknown): x is { PaymentService: any } =>
  !!x && typeof x === "object" && "PaymentService" in x && typeof x.PaymentService === "function";

const handlePayment = async ({
  evt,
  selectedEventType,
  paymentAppCredentials,
  booking,
  bookerName,
  bookerEmail,
  bookerPhoneNumber,
  isDryRun = false,
}: {
  evt: CalendarEvent;
  selectedEventType: Pick<EventType, "metadata" | "title">;
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: EventTypeAppsList;
    app: {
      dirName: string;
      categories: AppCategories[];
    } | null;
  };
  booking: {
    user: { email: string | null; name: string | null; timeZone: string; username: string | null } | null;
    id: number;
    userId: number | null;
    startTime: { toISOString: () => string };
    uid: string;
  };
  bookerName: string;
  bookerEmail: string;
  bookerPhoneNumber?: string | null;
  isDryRun?: boolean;
}) => {
  if (isDryRun) return null;
  const key = paymentAppCredentials?.app?.dirName;

  const paymentAppImportFn = PaymentServiceMap[key as keyof typeof PaymentServiceMap];
  if (!paymentAppImportFn) {
    console.warn(`payment app not implemented for key: ${key}`);
    return null;
  }

  const paymentAppModule = await paymentAppImportFn;
  if (!isPaymentService(paymentAppModule)) {
    console.warn(`payment App service not found for key: ${key}`);
    return null;
  }
  const PaymentService = paymentAppModule.PaymentService;
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

  const apps = eventTypeMetaDataSchemaWithTypedApps.parse(selectedEventType?.metadata)?.apps;

  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";

  let paymentData;
  if (paymentOption === "HOLD") {
    paymentData = await paymentInstance.collectCard(
      {
        amount: apps?.[paymentAppCredentials.appId].price,
        currency: apps?.[paymentAppCredentials.appId].currency,
      },
      booking.id,
      paymentOption,
      bookerEmail,
      bookerPhoneNumber
    );
  } else {
    paymentData = await paymentInstance.create(
      {
        amount: apps?.[paymentAppCredentials.appId].price,
        currency: apps?.[paymentAppCredentials.appId].currency,
      },
      booking.id,
      booking.userId,
      booking.user?.username ?? null,
      bookerName,
      paymentOption,
      bookerEmail,
      bookerPhoneNumber,
      selectedEventType.title,
      evt.title
    );
  }

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }
  try {
    await paymentInstance.afterPayment(evt, booking, paymentData, selectedEventType?.metadata);
  } catch (e) {
    console.error(e);
  }
  return paymentData;
};

export { handlePayment };
