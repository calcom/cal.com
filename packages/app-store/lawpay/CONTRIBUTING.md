# Contributing to LawPay Integration

Thank you for your interest in contributing to the LawPay payment integration for Cal.com!

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- A LawPay developer account
- Cal.com development environment set up

### Environment Variables

Create a `.env` file with:

```bash
LAWPAY_CLIENT_ID=your_client_id
LAWPAY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_LAWPAY_PUBLIC_KEY=your_public_key
LAWPAY_API_URL=https://api.lawpay.com  # or sandbox URL for testing
```

### Running Locally

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run type checking
pnpm type-check
```

## Code Structure

```
packages/app-store/lawpay/
├── api/                    # API endpoints
│   ├── callback.ts        # OAuth callback handler
│   └── webhook.ts         # Payment webhook handler
├── components/            # React components
│   └── EventTypeAppCardInterface.tsx
├── lib/                   # Core logic
│   ├── client.ts         # LawPay API client
│   └── LawPayPaymentService.ts
├── pages/                 # Next.js pages
│   └── setup.tsx         # Setup/onboarding page
├── static/               # Static assets
│   └── icon.svg
├── test/                 # Tests
│   └── lawpay.test.ts
├── _metadata.ts          # App metadata
├── config.json           # App configuration
├── index.ts              # Main export
├── package.json
├── README.md
└── zod.ts               # Schema validation
```

## Making Changes

### Adding New Features

1. Create a new branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Add tests for new functionality
4. Update documentation
5. Submit a pull request

### Testing

All new features should include tests:

```typescript
// packages/app-store/lawpay/test/your-feature.test.ts
import { describe, it, expect } from "vitest";

describe("Your Feature", () => {
  it("should work correctly", () => {
    // Your test
  });
});
```

### Code Style

- Follow existing code patterns
- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Use meaningful variable names

### Commit Messages

Follow conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring

Example: `feat: add support for recurring payments`

## API Integration

### LawPay API Client

The `LawPayClient` class handles all API communication:

```typescript
const client = new LawPayClient(credentials);

// Create payment
const payment = await client.createPayment({
  amount: 100,
  currency: "usd",
  accountType: "operating",
});

// Refund payment
await client.refundPayment(paymentId);
```

### Payment Service

The `LawPayPaymentService` implements the Cal.com payment interface:

```typescript
const service = new LawPayPaymentService(credentials, "ON_BOOKING");

// Create payment
await service.create(payment, bookingId, ...);

// Refund
await service.refund(paymentId);
```

## Trust Accounting Compliance

When working on trust account features:

1. **Never comingle funds**: Operating and trust accounts must remain separate
2. **Follow IOLTA rules**: Ensure compliance with attorney trust accounting regulations
3. **Audit trail**: Maintain detailed logs of all trust account transactions
4. **Test thoroughly**: Trust account features require extra scrutiny

## Security Considerations

- Never log sensitive data (API keys, tokens, payment details)
- Use environment variables for credentials
- Validate all user input
- Sanitize data before database operations
- Follow OWASP security guidelines

## Documentation

Update documentation when:

- Adding new features
- Changing API behavior
- Modifying configuration options
- Adding environment variables

## Pull Request Process

1. Update README.md with details of changes
2. Update CHANGELOG.md
3. Ensure all tests pass
4. Request review from maintainers
5. Address review feedback
6. Squash commits before merging

## Questions?

- Check the [README.md](./README.md)
- Review [LawPay API docs](https://developers.8am.com)
- Ask in Cal.com Discord
- Open a GitHub discussion

## License

By contributing, you agree that your contributions will be licensed under the same license as Cal.com.
