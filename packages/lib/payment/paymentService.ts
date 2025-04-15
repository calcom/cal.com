import type { Payment } from "@prisma/client";

import type { AppCategories } from "@calcom/prisma/enums";
import type { IAbstractPaymentService, PaymentApp } from "@calcom/types/PaymentService";

export const appStore: Record<string, PaymentApp> = {};

export const getPaymentAppFromPayment = (payment: Pick<Payment, "appId" | "paymentOption">) => {
  let appId = payment.appId;
  if (!appId && payment.paymentOption === "HOLD") {
    appId = "stripe";
  }

  const paymentApp = appStore[appId as keyof typeof appStore] as PaymentApp;
  return paymentApp;
};

export const getPaymentService = (
  payment: Pick<Payment, "appId" | "paymentOption">
): IAbstractPaymentService | null => {
  const paymentApp = getPaymentAppFromPayment(payment);
  if (!paymentApp) {
    return null;
  }
  return paymentApp.lib.PaymentService;
};

export const getPaymentAppByCategory = (category: AppCategories): PaymentApp[] => {
  return Object.values(appStore).filter((app) => app.category === category) as unknown as PaymentApp[];
};
