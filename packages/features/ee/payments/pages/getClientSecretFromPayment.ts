import type { Payment } from "@calcom/prisma/client";

function hasStringProp<T extends string>(x: unknown, key: T): x is { [key in T]: string } {
  return !!x && typeof x === "object" && key in x;
}

export function getClientSecretFromPayment(
  payment: Omit<Partial<Payment>, "data"> & { data: Record<string, unknown> }
) {
  if (
    payment.paymentOption === "HOLD" &&
    hasStringProp(payment.data, "setupIntent") &&
    hasStringProp(payment.data.setupIntent, "client_secret")
  ) {
    return payment.data.setupIntent.client_secret;
  }
  if (hasStringProp(payment.data, "client_secret")) {
    return payment.data.client_secret;
  }
  return "";
}
