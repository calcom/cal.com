// packages/lib/payment/handlePayment.ts
import type { AppCategories, Prisma } from "@prisma/client";

import { PAYMENT_APPS } from "@calcom/app-store/payment.apps.generated";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

type PaymentServiceCtor = new (...args: any[]) => IAbstractPaymentService;
type PaymentModule = { lib: { PaymentService: PaymentServiceCtor } };

const isPaymentModule = (x: unknown): x is PaymentModule =>
  !!x && typeof x === "object" && !!(x as any)?.lib?.PaymentService;

const normalizeKey = (s: string | null | undefined) => (s ?? "").replace(/[_-]/g, "").toLowerCase();

function resolveFromRegistry<T extends Record<string, unknown>>(
  registry: T,
  rawKey: string | null | undefined
): (() => Promise<unknown>) | undefined {
  const want = normalizeKey(rawKey);
  const match = (Object.keys(registry) as Array<keyof T>).find((k) => normalizeKey(String(k)) === want);
  const f = match ? (registry as any)[String(match)] : undefined;
  return typeof f === "function" ? (f as () => Promise<unknown>) : undefined;
}

export const handlePayment = async ({
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
  selectedEventType: Pick<CompleteEventType, "metadata" | "title">;
  paymentAppCredentials: {
    key: Prisma.JsonValue;
    appId: EventTypeAppsList;
    app: { dirName: string; categories: AppCategories[] } | null;
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

  const dir = paymentAppCredentials?.app?.dirName || null;
  const modFactory = resolveFromRegistry(PAYMENT_APPS as Record<string, unknown>, dir);
  const paymentApp = modFactory ? await modFactory() : null;

  if (!isPaymentModule(paymentApp)) {
    console.warn(`payment App service of type ${dir} is not implemented`);
    return null; // soft-fail; tests expect this
  }

  const { PaymentService } = paymentApp.lib; // now proven non-undefined
  const paymentInstance = new PaymentService(paymentAppCredentials);

  const parsed = eventTypeAppMetadataOptionalSchema.safeParse(selectedEventType?.metadata?.apps);
  const apps = parsed.success ? parsed.data : undefined;
  const appMeta = apps?.[paymentAppCredentials.appId];

  const price = typeof appMeta?.price === "number" ? appMeta.price : undefined;
  const currency = typeof appMeta?.currency === "string" ? appMeta.currency : undefined;
  const paymentOption = (appMeta?.paymentOption as "ON_BOOKING" | "HOLD" | undefined) ?? "ON_BOOKING";

  if (!price || !currency) {
    console.warn(`payment metadata incomplete for appId=${paymentAppCredentials.appId}; returning null`);
    return null;
  }

  let paymentData: unknown = null;
  if (paymentOption === "HOLD") {
    paymentData = await paymentInstance.collectCard(
      { amount: price, currency },
      booking.id,
      paymentOption,
      bookerEmail,
      bookerPhoneNumber
    );
  } else {
    paymentData = await paymentInstance.create(
      { amount: price, currency },
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
  if (!paymentData) return null;

  try {
    await paymentInstance.afterPayment(evt, booking, paymentData, selectedEventType?.metadata);
  } catch (e) {
    console.error("afterPayment error:", e);
  }
  return paymentData;
};
