const { processRefund } = require('../services/refundService');

// Test cases for refund processing based on defined policies
// Stripe Refund Documentation: https://stripe.com/docs/refunds
// PayPal Refund Documentation: https://developer.paypal.com/docs/api/payments/v2/

test('should process refund for unconfirmed Stripe booking', () => {
  const booking = { status: 'unconfirmed' };
  expect(() => processRefund('stripe', booking)).not.toThrow();
});

test('should not process refund for customer cancellation on PayPal', () => {
  const booking = { cancellationRequested: true };
  expect(() => processRefund('paypal', booking)).toThrow('Refund not allowed under current policy');
});

test('should process refund for technical failure on PayPal', () => {
  const booking = { paymentFailed: true };
  expect(() => processRefund('paypal', booking)).not.toThrow();
}); 