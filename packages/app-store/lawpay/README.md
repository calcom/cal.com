# LawPay Integration for Cal.com

LawPay (AffiniPay) integration for Cal.com enables secure payment processing designed specifically for legal professionals.

## Features

- **Ethics Compliance**: Separates earned and unearned fees to ensure ABA Model Rule 1.15 compliance
- **Trust Account Management**: Automatically manages trust accounting for legal professionals
- **Secure Processing**: Bank-level security with PCI DSS Level 1 compliance
- **Multiple Payment Methods**: Accept credit cards, debit cards, and ACH payments
- **Easy Integration**: Seamless integration with Cal.com booking system

## About LawPay

LawPay is the leading payment technology built specifically for law firms. Since 2009, we've helped over 50,000 legal professionals process billions in payments while maintaining the highest standards of legal ethics and security.

## Setup

1. Create a LawPay account at [lawpay.com](https://lawpay.com)
2. Obtain your API credentials from the LawPay dashboard
3. Configure the integration in Cal.com with your API key and environment settings

## Testing

### Unit Tests

Run the comprehensive unit test suite:

```bash
npx vitest run lawpay.test.ts
```

### Integration Tests

Test actual API connectivity (requires valid credentials):

```bash
# Set environment variables
export LAWPAY_API_KEY="your-api-key"
export LAWPAY_MERCHANT_ID="your-merchant-id"
export LAWPAY_ENVIRONMENT="sandbox"

# Run integration tests
node test-integration.js

# Or run all tests
./run-tests.sh
```

### Test Coverage

The test suite includes:

- **API Client Tests**: Authentication, payment creation, webhook verification
- **Payment Service Tests**: All payment lifecycle operations
- **Type Validation Tests**: Schema validation and error handling
- **Integration Tests**: Real API connectivity and payment flow

## Support

For support, please contact:

- LawPay Support: <support@lawpay.com>
- Cal.com Support: <support@cal.com>

Learn more at [https://lawpay.com](https://lawpay.com)
