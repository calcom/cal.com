# LawPay Payment Integration for Cal.com

This integration enables attorneys to accept payments through LawPay, a payment processor specifically designed for legal professionals with built-in IOLTA trust accounting compliance.

## Features

- **IOLTA Compliance**: Automatically handles trust accounting requirements
- **Dual Account Support**: Separate operating and trust account processing
- **Secure Payments**: PCI-compliant credit card and eCheck processing
- **Real-time Processing**: Instant payment confirmation
- **Attorney-Focused**: Built specifically for legal professionals

## Installation

### Prerequisites

1. A LawPay account (sign up at [lawpay.com](https://lawpay.com))
2. API credentials from LawPay developer portal

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# LawPay API Credentials
LAWPAY_CLIENT_ID=your_client_id
LAWPAY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_LAWPAY_PUBLIC_KEY=your_public_key

# Optional: LawPay API URL (defaults to production)
LAWPAY_API_URL=https://api.lawpay.com
```

### Getting API Credentials

1. Log into your LawPay account
2. Navigate to **Settings** > **Integrations** or **Developers** section
3. Create a new application or select an existing one
4. Copy your Client ID, Client Secret, and Public Key
5. Add these credentials to your environment variables

## Usage

### For Attorneys

1. Install the LawPay app from the Cal.com app store
2. Connect your LawPay account using OAuth
3. Configure payment settings for your event types:
   - Set the payment amount
   - Choose currency (USD)
   - Select account type (Operating or Trust)
4. Enable payments on specific event types

### Account Types

- **Operating Account**: For general business payments (retainers, flat fees, etc.)
- **Trust Account**: For client funds that must be held in trust (IOLTA compliance)

## Trust Accounting Compliance

LawPay automatically ensures compliance with:
- ABA Model Rules of Professional Conduct
- State bar association trust accounting rules
- IOLTA (Interest on Lawyers' Trust Accounts) requirements

The integration prevents comingling of funds by routing payments to the appropriate account based on your configuration.

## API Integration

This integration uses the LawPay API v2. For detailed API documentation, visit:
- [LawPay Developer Portal](https://developers.8am.com)
- [API Reference](https://developers.8am.com/reference/api.html)

## Security

- All payment data is processed securely through LawPay's PCI-compliant infrastructure
- API credentials are encrypted and stored securely
- OAuth 2.0 authentication for secure account connection
- No sensitive payment information is stored in Cal.com

## Support

### Cal.com Support
- Email: support@cal.com
- Documentation: [Cal.com Docs](https://cal.com/docs)

### LawPay Support
- Help Center: [help.lawpay.com](https://help.lawpay.com)
- Developer Support: [developers.8am.com](https://developers.8am.com)

## Troubleshooting

### Common Issues

**Payment not processing**
- Verify your API credentials are correct
- Check that your LawPay account is active and in good standing
- Ensure the payment amount meets LawPay's minimum requirements

**Trust account not available**
- Verify your LawPay account has trust account processing enabled
- Contact LawPay support to enable trust account features

**OAuth connection failing**
- Clear browser cache and cookies
- Try reconnecting with a fresh OAuth flow
- Verify redirect URLs are configured correctly in LawPay

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Add your LawPay credentials

# Run development server
pnpm dev
```

### Testing

```bash
# Run tests
pnpm test

# Test payment flow
pnpm test:e2e
```

## License

This integration is part of Cal.com and follows the same license.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](../../../CONTRIBUTING.md) before submitting pull requests.

## Changelog

### v1.0.0 (Initial Release)
- LawPay payment integration
- Operating and trust account support
- OAuth authentication
- IOLTA compliance features
