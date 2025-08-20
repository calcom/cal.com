import { createCachedImport } from "../createCachedImport";

export const paymentLoaders = {
  alby: createCachedImport(() => import("../../alby")),
  paypal: createCachedImport(() => import("../../paypal")),
  stripepayment: createCachedImport(() => import("../../stripepayment")),
  hitpay: createCachedImport(() => import("../../hitpay")),
  btcpayserver: createCachedImport(() => import("../../btcpayserver")),
};

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  // @ts-expect-error FIXME
  paymentLoaders["mock-payment-app"] = createCachedImport(() => import("../../mock-payment-app/index"));
}

export type PaymentLoaderKey = keyof typeof paymentLoaders | "mock-payment-app";
