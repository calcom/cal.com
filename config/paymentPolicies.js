// Define refund policies for different payment services
// Stripe Refund Documentation: https://stripe.com/docs/refunds
// PayPal Refund Documentation: https://developer.paypal.com/docs/api/payments/v2/
const refundPolicies = {
  stripe: {
    unconfirmedBooking: true, // Allow refunds for unconfirmed bookings
    customerCancellation: true, // Allow refunds for customer cancellations
    technicalFailure: true, // Allow refunds for technical failures
  },
  paypal: {
    unconfirmedBooking: true, // Allow refunds for unconfirmed bookings
    customerCancellation: false, // Do not allow refunds for customer cancellations
    technicalFailure: true, // Allow refunds for technical failures
  },
};

module.exports = refundPolicies; 