const refundPolicies = require('../config/paymentPolicies');

// Function to process refunds
// Refer to the official documentation for refund policies:
// Stripe: https://stripe.com/docs/refunds
// PayPal: https://developer.paypal.com/docs/api/payments/v2/
function processRefund(paymentService, booking) {
  const policy = refundPolicies[paymentService];

  if (!policy) {
    throw new Error(`No refund policy defined for ${paymentService}`);
  }

  if (booking.status === 'unconfirmed' && policy.unconfirmedBooking) {
    // Logic to process refund for unconfirmed bookings
    console.log('Processing refund for unconfirmed booking');
  } else if (booking.cancellationRequested && policy.customerCancellation) {
    // Logic to process refund for customer cancellations
    console.log('Processing refund for customer cancellation');
  } else if (booking.paymentFailed && policy.technicalFailure) {
    // Logic to process refund for technical failures
    console.log('Processing refund for technical failure');
  } else {
    throw new Error('Refund not allowed under current policy');
  }
}

module.exports = { processRefund }; 