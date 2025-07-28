# Contributing FusionAuth OIDC Provider to Cal.com

This document outlines the steps to contribute the FusionAuth OIDC provider to the Cal.com project.

## Overview

The FusionAuth OIDC provider has been implemented as a custom authentication provider that integrates with Cal.com's existing authentication system. This implementation follows Cal.com's patterns and conventions.

## Files Added/Modified

### New Files

- `packages/features/auth/lib/providers/fusionauth-oidc.ts` - Main provider implementation
- `packages/features/auth/lib/providers/fusionauth-oidc.test.ts` - Unit tests
- `packages/features/auth/lib/providers/README.md` - Documentation
- `packages/features/auth/lib/providers/CONTRIBUTING.md` - This file
- `packages/prisma/migrations/add_oidc_identity_provider.sql` - Database migration

### Modified Files

- `packages/prisma/schema.prisma` - Added OIDC to IdentityProvider enum
- `packages/features/auth/lib/next-auth-options.ts` - Integrated FusionAuth provider

## Implementation Details

### 1. Provider Structure

The FusionAuth OIDC provider follows NextAuth.js provider patterns:

- Uses OAuth 2.0 with PKCE for security
- Implements proper profile mapping
- Supports email verification
- Handles account linking

### 2. Integration Points

- **Identity Provider Mapping**: Added `fusionauth-oidc` case to map to `IdentityProvider.OIDC`
- **JWT Callback**: Updated to handle FusionAuth OIDC authentication
- **Environment Configuration**: Added FusionAuth-specific environment variables

### 3. Security Features

- PKCE (Proof Key for Code Exchange)
- State parameter for CSRF protection
- Email verification validation
- Secure token handling

## Testing

### Unit Tests

Run the provider tests:

```bash
npm test packages/features/auth/lib/providers/fusionauth-oidc.test.ts
```

### Integration Tests

1. Set up FusionAuth instance
2. Configure environment variables
3. Test authentication flow end-to-end

## Environment Variables

Add these to your `.env` file:

```env
FUSIONAUTH_CLIENT_ID=your_client_id
FUSIONAUTH_CLIENT_SECRET=your_client_secret
FUSIONAUTH_ISSUER=https://your-fusionauth-domain.com
FUSIONAUTH_LOGIN_ENABLED=true
```

## FusionAuth Configuration

1. Create OAuth 2.0 application in FusionAuth
2. Set redirect URL to: `https://your-cal-domain.com/api/auth/callback/fusionauth-oidc`
3. Enable scopes: `openid`, `profile`, `email`
4. Set client authentication type to "Confidential"

## Contribution Steps

1. **Fork Cal.com repository**
2. **Create feature branch**: `git checkout -b feature/fusionauth-oidc-provider`
3. **Add files**: Copy all new files to appropriate locations
4. **Update existing files**: Apply modifications to schema and auth options
5. **Run tests**: Ensure all tests pass
6. **Test integration**: Verify FusionAuth authentication works
7. **Create pull request**: Submit PR with detailed description

## Pull Request Template

```markdown
## FusionAuth OIDC Provider

### Description
Adds FusionAuth as an OpenID Connect authentication provider to Cal.com.

### Changes
- Added FusionAuth OIDC provider implementation
- Updated IdentityProvider enum to include OIDC
- Integrated provider into NextAuth configuration
- Added comprehensive tests and documentation

### Testing
- [x] Unit tests pass
- [x] Integration tests with FusionAuth
- [x] Manual authentication flow testing

### Documentation
- [x] README with setup instructions
- [x] Environment variable documentation
- [x] FusionAuth configuration guide

### Security
- [x] PKCE implementation
- [x] State parameter validation
- [x] Email verification handling
- [x] Secure token management
```

## Review Checklist

Before submitting the PR, ensure:

- [ ] All tests pass
- [ ] Code follows Cal.com conventions
- [ ] Documentation is complete
- [ ] Security best practices are followed
- [ ] Environment variables are documented
- [ ] FusionAuth setup instructions are clear
- [ ] No breaking changes to existing functionality

## Questions or Issues

If you encounter any issues during implementation or have questions about the contribution process, please:

1. Check existing Cal.com documentation
2. Review similar provider implementations
3. Open an issue in the Cal.com repository
4. Reach out to the Cal.com community

## License

This implementation follows Cal.com's AGPLv3 license. Ensure your contribution complies with the project's licensing requirements.
