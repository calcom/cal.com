import { PAYMENT_APPS } from "@calcom/app-store/payment.apps.generated";
import type { Booking, EventType } from "@calcom/types/Models";
import type { PaymentAppCredentials } from "@calcom/types/Payment";

// type guard for dynamic apps
function isPaymentApp(m: unknown): m is {
  lib?: { PaymentService?: new (...args: any[]) => unknown };
} {
  return !!(m && typeof m === "object" && "lib" in (m as any));
}

// normalize + registry resolve helpers
const normalizeKey = (s: string) => s.replace(/[_-]/g, "").toLowerCase();
function resolveFromRegistry<T extends Record<string, unknown>>(
  registry: T,
  rawKey: string
): (() => Promise<unknown>) | undefined {
  const want = normalizeKey(rawKey);
  const match = (Object.keys(registry) as Array<keyof T>).find((k) => normalizeKey(String(k)) === want);
  const factory = match ? (registry as Record<string, unknown>)[String(match)] : undefined;
  return typeof factory === "function" ? (factory as () => Promise<unknown>) : undefined;
}

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
export async function handlePayment(
  paymentAppCredentials: PaymentAppCredentials | null,
  paymentOption: "HOLD" | "PAY",
  evt: unknown,
  booking: Booking,
  selectedEventType?: EventType
): Promise<any | null> {
  const dir = paymentAppCredentials?.app?.dirName ?? "";
  let paymentModule: unknown = null;

  try {
    const modFactory = resolveFromRegistry(PAYMENT_APPS as Record<string, unknown>, dir);
    paymentModule = modFactory ? await modFactory() : null;
  } catch (err) {
    console.warn(`Failed to load payment app module for ${dir}:`, err);
    return null; // legacy soft-fail
  }

  // unwrap default export if present
  const paymentApp =
    paymentModule && typeof paymentModule === "object" && "default" in (paymentModule as any)
      ? (paymentModule as any).default
      : paymentModule;

  if (!isPaymentApp(paymentApp)) {
    console.warn(`payment App service of type ${dir} is not implemented`);
    return null; // legacy soft-fail
  }

  const PaymentServiceCtor = paymentApp?.lib?.PaymentService as (new (...args: any[]) => unknown) | undefined;

  if (!PaymentServiceCtor) {
    throw new Error("PaymentService is not available in paymentApp.lib");
  }

  const paymentInstance = new PaymentServiceCtor(paymentAppCredentials);

  // widen until real types are introduced
  let paymentData: any;

  if (paymentOption === "HOLD") {
    paymentData = await (paymentInstance as any).collectCard?.({
      // TODO: paste your existing args here
    });
  } else {
    paymentData = await (paymentInstance as any).create?.({
      // TODO: paste your existing args here
    });
  }

  if (!paymentData) {
    console.error("Payment data is null");
    throw new Error("Payment data is null");
  }

  try {
    await (paymentInstance as any).afterPayment?.(evt, booking, paymentData, selectedEventType?.metadata);
  } catch (e) {
    console.error(e);
  }

  return paymentData;
}
