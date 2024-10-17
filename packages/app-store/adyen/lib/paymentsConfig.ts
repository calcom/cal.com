const identifier = new Date().getMilliseconds();

const paymentsConfig = {
  origin: "http://localhost:3020",
  returnUrl: "http://localhost:3020/redirect",
  reference: `${identifier}-checkout-components-ref`,
  authenticationData: {
    attemptAuthentication: "always",
    threeDSRequestData: {
      nativeThreeDS: "preferred",
    },
  },
  shopperEmail: "test-shopper@storytel.com",
  shopperIP: "172.30.0.1",
  channel: "Web",
  browserInfo: {
    acceptHeader: "http",
  },
  lineItems: [
    {
      taxPercentage: 0,
      id: "item1",
      taxAmount: 0,
      description: "Test Item 1",
      amountIncludingTax: 75900,
      quantity: 1,
      taxCategory: "None",
      amountExcludingTax: 75900,
    },
    {
      taxPercentage: 0,
      id: "item2",
      taxAmount: 0,
      description: "Test Item 2",
      amountIncludingTax: 10000,
      quantity: 1,
      taxCategory: "None",
      amountExcludingTax: 10000,
    },
  ],
};
export default paymentsConfig;
