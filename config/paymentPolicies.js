// Define refund policies for different payment services
// Stripe Refund Documentation: https://stripe.com/docs/refunds
// PayPal Refund Documentation: https://developer.paypal.com/docs/api/payments/v2/
const refundPolicies = {
  policy1: "Full refund within 30 days of purchase.",
  policy2: "50% refund within 60 days of purchase.",
  // Add more policies as needed
};

module.exports = {
  stripe: {
    unconfirmedBooking: true,
    customerCancellation: false,
    technicalFailure: true,
    policyName: "Stripe Refund Policy",
    conditions: "Refunds are processed for unconfirmed bookings and technical failures.",
  },
  paypal: {
    unconfirmedBooking: false,
    customerCancellation: false,
    technicalFailure: true,
    policyName: "PayPal Refund Policy",
    conditions: "Refunds are processed for technical failures only.",
  },
  newPaymentService: {
    unconfirmedBooking: false,
    customerCancellation: true,
    technicalFailure: false,
    policyName: "New Service Refund Policy",
    conditions: "Refunds allowed for customer cancellations within 45 days.",
  },
  refundPolicies,
};
