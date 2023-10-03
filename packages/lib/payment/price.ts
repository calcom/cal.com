type StripeAppData = {
  enabled: boolean;
  price: number;
  currency: string;
  paymentOption: string;
  credentialId?: number;
  chargeDeposit: boolean;
  depositPercentage: number;
};
export function getRemainingPrice(paymentAppData: StripeAppData) {
  if (paymentAppData.chargeDeposit && paymentAppData.depositPercentage > 0) {
    return paymentAppData.price * (paymentAppData.depositPercentage / 100);
  }

  return paymentAppData.price;
}
