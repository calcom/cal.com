import { createCachedImport } from "../createCachedImport";

const paymentLoaders = {
  alby: createCachedImport(() => import("../../alby/lib")),
  paypal: createCachedImport(() => import("../../paypal/lib")),
  stripepayment: createCachedImport(() => import("../../stripepayment/lib")),
  hitpay: createCachedImport(() => import("../../hitpay/lib")),
  btcpayserver: createCachedImport(() => import("../../btcpayserver/lib")),
};

if (process.env.MOCK_PAYMENT_APP_ENABLED !== undefined) {
  // @ts-expect-error FIXME
  paymentLoaders["mock-payment-app"] = createCachedImport(() => import("../../mock-payment-app/index"));
}

export type PaymentLoaderKey = keyof typeof paymentLoaders | "mock-payment-app";

export default paymentLoaders;
