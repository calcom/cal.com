# Organization Creation & Billing System Implementation

## 🎯 Overview
This PR implements a comprehensive organization creation flow with Stripe integration, including team management, onboarding, and billing features.

## 🔄 Core Changes

### Organization Creation & Management
- Added new organization creation flow with multi-step wizard layout
- Implemented slug availability checking functionality
- Created organization onboarding store using Zustand
- Reduced minimum seats requirement from 30 to 5 for both self-serve and overall organizations

### Billing Integration
- Integrated Stripe billing system for organizations
  - Added `STRIPE_ORG_PRODUCT_ID` to environment and configuration
  - Implemented payment intent creation and subscription management
  - Added webhook handlers for invoice payments and subscription events
- Created comprehensive billing service architecture:
  - `OrganizationBilling` abstract class
  - `InternalOrganizationBilling` implementation
  - `StubOrganizationBilling` for testing
  - `OrganizationBillingRepository` for data access

### Team Management
- Added new team member management features:
  - Form for adding new team members
  - Weight editing functionality for team members
  - CSV import/export capabilities
- Created seeded teams (Marketing and Design) with predefined event types

### Database Changes
- Added new `OrganizationOnboarding` table
- Added indexes to Impersonations and Watchlist models

## 🏗️ New Components
1. `AboutOrganizationForm` - Organization profile setup
2. `AddNewTeamsForm` - Team creation and management
3. `AddNewTeamMembersForm` - Member onboarding
4. `PaymentSuccessView` - Payment confirmation page
5. `EditWeightsForAllTeamMembers` - Team member weight management

## 🔒 Security & Permissions
- Implemented `OrganizationPermissionService` for access control
- Added validation for organization creation and team migration
- Secure handling of payment and subscription data

## 🧪 Testing
- Added comprehensive test suite for:
  - Organization payment services
  - Permission validation
  - Billing operations

## 📝 Configuration Updates
- Updated tsconfig.json to include new feature paths
- Added Stripe webhook listening script
- Updated turbo.json with new environment variables

## 🔄 Migration Impact
- New database migrations for OrganizationOnboarding
- Changes to team structure and member management
- Updates to billing and payment workflows

## 📋 Testing Checklist
- [ ] Organization creation flow
- [ ] Stripe payment integration
- [ ] Team member management
- [ ] Permission checks
- [ ] Webhook handlers
- [ ] Database migrations
- [ ] CSV import/export functionality

## 🚀 Next Steps
1. Review and test the complete organization creation flow
2. Verify Stripe integration in staging environment
3. Run database migrations
4. Update documentation with new organization features 