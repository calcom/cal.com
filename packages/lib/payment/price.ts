export function getRemainingPrice(paymentAppData) {
  if (paymentAppData.chargeDeposit && paymentAppData.depositPercentage > 0) {
    return paymentAppData.price * (paymentAppData.depositPercentage / 100);
  }

  return paymentAppData.price;
}
