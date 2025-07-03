# Cal.com Codebase Structure and Exchange Integration Fix

## 📁 Cal.com Codebase Structure

Cal.com is a monorepo built with modern web technologies, using a microservices architecture with shared packages.

### 🏗️ Root Structure
```
cal.com/
├── apps/                    # Main applications
│   ├── web/                 # Main Next.js web application
│   ├── api/                 # API services (v1 & v2)
│   └── ui-playground/       # UI component playground
├── packages/                # Shared packages and libraries
│   ├── app-store/          # Calendar/CRM/Video integrations
│   ├── features/           # Feature-specific modules
│   ├── ui/                 # Shared UI components
│   ├── lib/                # Utility libraries
│   ├── prisma/             # Database schema and client
│   ├── trpc/               # API layer with type safety
│   ├── types/              # TypeScript type definitions
│   ├── emails/             # Email templates
│   ├── embeds/             # Embed functionality
│   └── platform/           # Platform API
├── deploy/                 # Deployment configurations
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
├── tests/                  # Test suites
└── infra/                  # Infrastructure configs
```

### 🚀 Main Applications

#### `/apps/web/` - Main Web Application
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Key Directories**:
  - `pages/` - Next.js pages (API routes & pages)
  - `components/` - React components
  - `lib/` - Web-specific utilities
  - `modules/` - Feature modules
  - `styles/` - Global styles

#### `/apps/api/` - API Services
- **v1/**: Legacy API endpoints
- **v2/**: Modern RESTful API
- GraphQL and tRPC endpoints

### 📦 Core Packages

#### `/packages/app-store/` - Integration Hub
The app store contains all third-party integrations:
- **Calendar Apps**: Google, Outlook, Exchange, Apple, etc.
- **Video Apps**: Zoom, Google Meet, Daily.co, etc.
- **CRM Apps**: Salesforce, HubSpot, Pipedrive, etc.
- **Payment Apps**: Stripe, PayPal, etc.

Each app follows this structure:
```
packages/app-store/{app-name}/
├── api/                    # Backend integration logic
├── components/             # React components
├── lib/                    # App-specific utilities
├── pages/                  # Setup/config pages
├── static/                 # Static assets
├── _metadata.ts            # App metadata
└── config.json             # App configuration
```

#### `/packages/features/` - Feature Modules
- `auth/` - Authentication logic
- `bookings/` - Booking management
- `calendars/` - Calendar integrations
- `eventtypes/` - Event type management
- `settings/` - User/team settings
- `schedules/` - Availability schedules
- `webhooks/` - Webhook functionality

#### `/packages/ui/` - Design System
- Shared React components
- Consistent styling with Tailwind
- Form components, buttons, modals, etc.

#### `/packages/lib/` - Utilities
- `crypto.ts` - Encryption utilities
- `emails/` - Email sending logic
- `hooks/` - React hooks
- `auth/` - Authentication helpers

#### `/packages/prisma/` - Database
- Database schema definition
- Prisma client configuration
- Migrations and seeds

#### `/packages/trpc/` - Type-Safe API
- API router definitions
- Input/output schemas with Zod
- Type-safe client/server communication

### 🛠️ Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, tRPC, Prisma ORM
- **Database**: PostgreSQL (primary), MySQL (supported)
- **Authentication**: NextAuth.js
- **Email**: Various providers (SMTP, SendGrid, etc.)
- **File Storage**: Uploadthing, AWS S3
- **Deployment**: Vercel, Docker, Railway
- **Testing**: Playwright, Vitest, Jest
- **Build Tool**: Turbo (monorepo management)

---

## 🐛 Exchange Integration Bounty Fix - Issue #8123

**Bounty Value**: $40  
**Issue**: CAL-1425 - Exchange on Premise 2016/2019 Integration Fails

### Problem Analysis

The Exchange integration has several critical issues:

1. **Missing Exchange 2019 Support**: Enum only includes versions up to 2016
2. **Node.js OpenSSL Error**: `error:0308010C:digital envelope routines::unsupported` with NTLM auth
3. **401 Unauthorized**: Authentication failures with both Basic and NTLM methods
4. **Outdated Dependencies**: Using older EWS libraries that may not be compatible with newer Node.js versions

### Root Causes

1. **OpenSSL 3.0 Compatibility**: Node.js 17+ uses OpenSSL 3.0 which deprecated legacy algorithms used by NTLM libraries
2. **Missing Exchange Version**: No enum value for Exchange 2019
3. **Authentication Method Handling**: Improper configuration for on-premise Exchange servers
4. **Error Handling**: Generic error messages that don't help diagnose the actual issue

### Solution Implementation

#### 1. Update Exchange Version Enum

```typescript
// packages/app-store/exchangecalendar/enums.ts
export enum ExchangeVersion {
  Exchange2007_SP1 = 0,
  Exchange2010 = 1,
  Exchange2010_SP1 = 2,
  Exchange2010_SP2 = 3,
  Exchange2013 = 4,
  Exchange2013_SP1 = 5,
  Exchange2015 = 6,
  Exchange2016 = 7,
  Exchange2019 = 8,  // NEW: Added Exchange 2019 support
}
```

#### 2. Fix Node.js OpenSSL Compatibility

The solution involves:
- Adding Node.js legacy OpenSSL provider support
- Updating the NTLM authentication setup
- Adding proper error handling for crypto issues

#### 3. Improve Authentication Handling

- Better Basic Auth configuration
- Enhanced NTLM setup with proper certificate handling
- Improved error messages for debugging

#### 4. Update UI to Support Exchange 2019

Add the new version to the setup form options.

### Files Modified

1. `packages/app-store/exchangecalendar/enums.ts` - Add Exchange 2019
2. `packages/app-store/exchangecalendar/lib/CalendarService.ts` - Fix OpenSSL and auth issues
3. `packages/app-store/exchangecalendar/pages/setup/index.tsx` - Add Exchange 2019 to UI
4. `packages/app-store/exchangecalendar/api/_postAdd.ts` - Improve error handling

### Testing Strategy

1. **Local Testing**: Set up Exchange 2016/2019 development environment
2. **Authentication Testing**: Test both Basic and NTLM auth methods
3. **Error Handling**: Verify proper error messages are displayed
4. **Integration Testing**: Full calendar sync and event creation testing

### Deployment Considerations

- Ensure Node.js environment supports legacy OpenSSL when needed
- Document configuration requirements for on-premise Exchange
- Add troubleshooting guide for common issues

---

## 🎯 Next Steps

1. Implement the Exchange integration fixes
2. Test with real Exchange 2016/2019 environments
3. Update documentation with setup instructions
4. Submit PR with `/claim #8123` to claim the bounty

This fix will resolve the long-standing Exchange on-premise integration issues and enable Cal.com to work seamlessly with Exchange 2016/2019 servers.