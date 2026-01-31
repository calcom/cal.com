import { HttpError } from "@calcom/lib/http-error";
import type { Prisma } from "@calcom/prisma/client";

export function safeJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function hasStringProp<T extends string>(x: unknown, key: T): x is { [K in T]: string } {
  return !!x && typeof x === "object" && key in x && typeof (x as Record<string, unknown>)[key] === "string";
}

export function getStripeAccountFromPaymentData(paymentData: unknown): string {
  if (hasStringProp(paymentData, "stripeAccount")) return paymentData.stripeAccount;
  throw new HttpError({
    statusCode: 400,
    message: "Stripe account not found on payment",
    data: { code: "stripe_account_missing" },
  });
}

export async function lockPaymentById(tx: Prisma.TransactionClient, paymentId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(paymentId)})`;
}
