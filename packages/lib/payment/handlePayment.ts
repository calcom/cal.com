// packages/lib/payment/handlePayment.ts
import type { AppCategories, Prisma } from "@prisma/client";

import { PAYMENT_APPS } from "@calcom/app-store/payment.apps.generated";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { CompleteEventType } from "@calcom/prisma/zod";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

// ---------- type guards ----------
const isPaymentApp = (x: unknown): x is PaymentApp =>
  !!x &&
  typeof x === "object" &&
  "lib" in (x as any) &&
  typeof (x as any).lib === "object" &&
  !!(x as any).lib &&
  "PaymentService" in (x as any).lib;

// ---------- registry resolver (normalized keys) ----------
const normalizeKey = (s: string | null | undefined) => (s ?? "").replace(/[_-]/g, "").toLowerCase();

/** Find a factory in a generated registry by normalized key */
function resolveFromRegistry<T extends Record<string, unknown>>(
  registry: T,
  rawKey: string | null | undefined
): (() => Promise<unknown>) | undefined {
  const want = normalizeKey(rawKey);
  const match = (Object.keys(registry) as Array<keyof T>).find((k) => normalizeKey(String(k)) === want);
  const factory = match ? (registry as Record<string, unknown>)[String(match)] : undefined;
  return typeof factory === "function" ? (factory as () => Promise<unknown>) : undefined;
}

// ---------- main ----------
/**
 * Creates/collects payment using the selected app, returning provider-specific paymentData
 * or null when the service is missing/unsupported (legacy soft-fail behavior).
 */
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
  selectedEventType: Pick<CompleteEventType, "metadata" | "title">;
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

  // Resolve the payment app via normalized key (supports '-' vs '_' vs case)
  const dir = paymentAppCredentials?.app?.dirName || null;
  const modFactory = resolveFromRegistry(PAYMENT_APPS as Record<string, unknown>, dir);
  const paymentApp = modFactory ? await modFactory() : null;

  if (!isPaymentApp(paymentApp)) {
    console.warn(`payment App service of type ${dir} is not implemented`);
    return null; // legacy soft-fail; tests assert on this behavior
  }

  const PaymentService = paymentApp.lib?.PaymentService;
  if (!PaymentService) {
    throw new Error("PaymentService is not available in paymentApp.lib");
  }
  const paymentInstance = new PaymentService(paymentAppCredentials) as IAbstractPaymentService;

  // EventType apps metadata (validated)
  const apps = eventTypeAppMetadataOptionalSchema.parse(selectedEventType?.metadata?.apps);
  const paymentOption = apps?.[paymentAppCredentials.appId].paymentOption || "ON_BOOKING";

  let paymentData: any;

  if (paymentOption === "HOLD") {
    // collect card (authorization-only)
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
    // immediate charge
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
