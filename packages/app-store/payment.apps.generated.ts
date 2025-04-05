import * as AlbyPaymentApp from "./alby/index";
import * as HitpayPaymentApp from "./hitpay/index";
import * as MockPaymentApp from "./mock-payment-app/index";
import * as PaypalPaymentApp from "./paypal/index";
import * as StripePaymentApp from "./stripepayment/index";

export const PaymentAppMap = {
  alby: AlbyPaymentApp,
  hitpay: HitpayPaymentApp,
  "mock-payment-app": MockPaymentApp,
  paypal: PaypalPaymentApp,
  stripepayment: StripePaymentApp,
};
