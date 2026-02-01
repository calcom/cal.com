# Changelog

All notable changes to the LawPay payment integration will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial LawPay payment integration for Cal.com
- OAuth 2.0 authentication flow
- Support for operating and trust (IOLTA) accounts
- Payment creation, capture, and refund functionality
- Webhook handler for payment status updates
- Event type configuration UI with account type selection
- Comprehensive API client with token refresh
- Setup page with onboarding flow
- Full test coverage
- Documentation and contributing guidelines

### Features
- **IOLTA Compliance**: Automatic trust accounting compliance
- **Dual Account Support**: Separate operating and trust account processing
- **Secure Payments**: PCI-compliant credit card and eCheck processing
- **Real-time Processing**: Instant payment confirmation via webhooks
- **Attorney-Focused**: Built specifically for legal professionals

### Security
- OAuth 2.0 secure authentication
- Encrypted credential storage
- Webhook signature verification
- PCI-compliant payment processing

### Documentation
- Comprehensive README with setup instructions
- API documentation and examples
- Contributing guidelines
- Environment configuration examples
- Test suite with examples

## [Unreleased]

### Planned
- Support for recurring payments
- Enhanced reporting and analytics
- Multi-currency support expansion
- Payment plan functionality
- Advanced trust accounting reports
- Integration with legal practice management software

## Notes

### Breaking Changes
None in initial release.

### Migration Guide
This is the initial release. No migration needed.

### Deprecations
None.

### Known Issues
- Sandbox environment testing requires LawPay sandbox account
- Some advanced trust accounting features require LawPay enterprise plan

### Contributors
- Initial implementation by Cal.com team

---

For more information, see the [README](./README.md) or visit [LawPay Developer Portal](https://developers.8am.com).
