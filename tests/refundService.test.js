const { processRefund } = require('../services/refundService');
const request = require('supertest');
const app = require('../server/index');

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

test('should process refund for customer cancellation on newPaymentService', () => {
  const booking = { cancellationRequested: true };
  expect(() => processRefund('newPaymentService', booking)).not.toThrow();
});

test('should not process refund for unconfirmed booking on newPaymentService', () => {
  const booking = { status: 'unconfirmed' };
  expect(() => processRefund('newPaymentService', booking)).toThrow('Refund not allowed under current policy');
});

test('should not process refund for technical failure on newPaymentService', () => {
  const booking = { paymentFailed: true };
  expect(() => processRefund('newPaymentService', booking)).toThrow('Refund not allowed under current policy');
});

describe('GET /api/refund-policies', () => {
    it('should return refund policies', async () => {
        const response = await request(app).get('/api/refund-policies');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('policy1');
        expect(response.body).toHaveProperty('policy2');
    });
}); 