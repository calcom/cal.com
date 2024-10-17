export const API_HITPAY = process.env.NEXT_PUBLIC_API_HITPAY_PRODUCTION || "https://api.hit-pay.com";
export const SANDBOX_API_HITPAY =
  process.env.NEXT_PUBLIC_API_HITPAY_SANDBOX || "https://api.sandbox.hit-pay.com";

export const paymentOptions = [
  {
    label: "on_booking_option",
    value: "ON_BOOKING",
  },
];

export const supportedPaymentMethods = [
  "paynow",
  "grabpay",
  "shopeepay",
  "zip",
  "fpx",
  "visa",
  "master",
  "american_express",
  "alipay",
  "atome",
  "unionpay",
  "gcash",
  "qrph",
  "billease",
  "seveneleven",
  "cebuana",
  "palawa",
  "ovo",
  "gopay",
  "linkaja",
  "dana",
  "kredivo",
  "akulakupaylater",
  "akulaku",
  "indomaret",
  "alfamart",
  "bri",
  "cimb",
  "sbpl",
  "payid",
  "qris",
  "bdo",
  "bpi",
  "duitnow",
  "wechatpay",
  "qr_promptpay",
  "line_pay",
  "truemoney_pay",
];
