# Cal.com AI Phone Service Architecture

This package provides a comprehensive, provider-agnostic architecture for AI phone services in Cal.com, offering easy integration with different AI service providers, template management, and self-service UI components.

## Architecture Overview

The architecture implements multiple design patterns to create a maintainable, scalable, and flexible system:

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│       Frontend (React/Next.js)              │
│  - UI Components (Agent/Phone Management)   │
├─────────────────────────────────────────────┤
│          TRPC API Layer                     │
│  - Type-safe RPC endpoints                  │
│  - Request/Response validation              │
├─────────────────────────────────────────────┤
│       Service Layer                         │
│  - Business logic orchestration             │
│  - Provider abstraction                     │
├─────────────────────────────────────────────┤
│       Repository Layer                      │
│  - Data access abstraction                  │
│  - Query optimization                       │
├─────────────────────────────────────────────┤
│    Prisma ORM / Database                    │
│  - PostgreSQL with optimized queries        │
└─────────────────────────────────────────────┘
```

### Design Patterns Implemented

1. **Repository Pattern**: Encapsulates data access logic
2. **Factory Pattern**: Creates provider instances dynamically
3. **Strategy Pattern**: Allows switching between AI providers
4. **Service Pattern**: Orchestrates business logic
5. **Registry Pattern**: Manages provider registration
6. **Template Pattern**: Provides reusable conversation templates
7. **Mapper Pattern**: Transforms data between layers

## Key Components

### 1. Generic Interfaces (`interfaces/AIPhoneService.interface.ts`)

- `AIPhoneServiceProvider` - Main interface that all providers must implement
- `AIPhoneServiceConfiguration` - Configuration for setting up AI services
- `AIPhoneServiceProviderFactory` - Factory interface for creating providers
- Common data types (`AIPhoneServiceModel`, `AIPhoneServiceCall`, `AIPhoneServiceAgent`, etc.)
- Phone number management interfaces
- Agent and LLM management interfaces

### 2. Provider Registry (`AIPhoneServiceRegistry.ts`)

- `AIPhoneServiceRegistry` - Central registry for managing providers
- `createAIPhoneServiceProvider()` - Helper function to create providers
- `createDefaultAIPhoneServiceProvider()` - Convenience function for default provider
- Provider registration and management system

### 3. Template System

- **Template Types**: `CHECK_IN_APPOINTMENT` and `CUSTOM_TEMPLATE`
- **Prompt Templates** (`promptTemplates.ts`): Pre-defined conversation templates with placeholders
- **Field Mapping** (`template-fields-map.ts`): Dynamic field definitions for different template types
- **Schema Validation** (`zod-utils.ts`): Comprehensive validation schemas for all data types
- **Template Field Schema** (`getTemplateFieldsSchema.ts`): Dynamic schema generation based on template type

### 4. Provider Implementations (`providers/`)

- `retellAI/` - Complete Retell AI implementation with:
  - Provider class with full interface implementation
  - Factory for provider creation
  - SDK client for API communication
  - Service layer for business logic
  - Error handling and type definitions
- `example-future-provider/` - Example showing how to add new providers

### 5. UI Components (`components/`)

- `CreateAgentStep.tsx` - Step-by-step agent creation wizard
- `CreateWorkflowAgent.tsx` - Workflow-based agent setup
- `AgentsListPage.tsx` - Agent management and listing
- `SkeletonLoaderList.tsx` - Loading states for better UX

### 6. Pages (`pages/`)

- `agent.tsx` - Agent management page
- `index.tsx` - Main AI phone service dashboard

### 7. Data Layer Components

- **Repository Classes** (`/packages/lib/server/repository/`)
  - `PrismaAgentRepository` - Manages agent data access
  - `PrismaPhoneNumberRepository` - Handles phone number operations
- **Service Classes** (`providers/retellAI/RetellAIService.ts`)
  - Business logic orchestration
  - External API integration
- **Mapper Functions**
  - Transform between database models and DTOs
  - Handle data serialization/deserialization

## Architecture Patterns in Detail

### Repository Pattern

The repository pattern provides an abstraction layer over data access, making the system database-agnostic and testable.

**Benefits:**

- **Separation of Concerns**: Business logic separated from data access
- **Testability**: Easy to mock for unit tests
- **Flexibility**: Can switch between Prisma ORM and raw SQL
- **Reusability**: Common queries centralized in one place

### Factory Pattern

The factory pattern enables dynamic creation of provider instances without exposing instantiation logic.

**Benefits:**

- **Loose Coupling**: Client code doesn't depend on concrete classes
- **Extensibility**: Easy to add new providers
- **Configuration Management**: Centralized provider setup

### Service Pattern

Service layer orchestrates business operations and coordinates between multiple repositories and external services.

**Benefits:**

- **Business Logic Encapsulation**: Complex operations in one place
- **Transaction Management**: Coordinates multiple operations
- **Reusability**: Common workflows available to all consumers

### Registry Pattern

The registry pattern manages provider registration and lookup, acting as a service locator.

**Benefits:**

- **Dynamic Provider Management**: Add/remove providers at runtime
- **Centralized Configuration**: Single point for provider management
- **Dependency Injection**: Supports IoC principles

### Mapper Pattern

Mappers transform data between different representations (database models, DTOs, API responses).

**Benefits:**

- **Data Transformation**: Clean separation between layers
- **Flexibility**: Different representations for different contexts
- **Maintainability**: Changes in one layer don't affect others

### Strategy Pattern

The strategy pattern allows switching between different AI providers seamlessly.

**Benefits:**

- **Provider Independence**: Switch providers without changing client code
- **Extensibility**: Add new providers easily
- **Testing**: Mock providers for testing

## Integration with Cal.com Workflows

The AI Phone system is designed specifically for Cal.com's workflow automation, enabling AI-powered phone calls as part of scheduling workflows.

### Workflow Integration Architecture

```
┌─────────────────────────────────────────────┐
│         Cal.com Workflow Engine              │
├─────────────────────────────────────────────┤
│        Workflow Step: AI Phone Call          │
├─────────────────────────────────────────────┤
│      AI Phone Service (via Registry)         │
├─────────────────────────────────────────────┤
│        Agent + Phone Number Setup            │
└─────────────────────────────────────────────┘
```

### Workflow Step Configuration

AI Phone calls are configured as workflow steps with specific triggers.

### Supported Workflow Triggers

AI Phone calls can be triggered by various workflow events:

- **BEFORE_EVENT**: Call attendees before appointments
- **AFTER_EVENT**: Follow up after meetings
- **NEW_EVENT**: Welcome calls for new bookings
- **RESCHEDULE_EVENT**: Notify about schedule changes
- **CANCELLED_EVENT**: Handle cancellation calls

### Workflow Execution Flow

```
1. Workflow Trigger (e.g., 24 hours before event)
   ↓
2. Workflow Engine schedules AI Phone Call task
   ↓
3. Task Runner (executeAIPhoneCall) executes
   ↓
4. AI Phone Service creates call with dynamic data
   ↓
5. Call connects and AI handles conversation
   ↓
6. Call results logged back to workflow
```

### Rate Limiting for Workflows

To prevent abuse, workflow AI calls are rate-limited.

## Data Flow Architecture

### Workflow-Specific Data Flow

```
1. Workflow Trigger Event
   ↓
2. Workflow Step Configuration Retrieved
   ↓
3. Booking & Attendee Data Fetched
   ↓
4. Dynamic Variables Prepared
   ↓
5. AI Agent & Phone Number Selected
   ↓
6. Phone Call Initiated
   ↓
7. Results Logged to Workflow
```

## Usage Examples

For complete usage examples, please refer to:

- **Basic Usage**: See commented examples in [`index.ts`](./index.ts)
- **Provider Setup**: Check provider factories in [`providers/`](./providers/)
- **Workflow Integration**: Review [`packages/features/handleCreatePhoneCall.ts`](../handleCreatePhoneCall.ts)

### Field Types

Supported field types include:

- `text`, `textarea`, `number`, `email`, `phone`
- `address`, `multiemail`, `select`, `multiselect`
- `checkbox`, `radio`, `radioInput`, `boolean`

### Template Variables

Templates support dynamic variables:

- `{{scheduler_name}}` - Name of the scheduler
- `{{name}}` - Guest name
- `{{email}}` - Guest email
- `{{company}}` - Guest company
- `{{current_time}}` - Current timestamp
- And many more

## Adding New Providers

For detailed instructions on adding new providers, see the [example provider implementation](./providers/example-future-provider/).

## Environment Variables

- `RETELL_AI_KEY` - API key for Retell AI (required when using Retell AI provider)
- `STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID` - Stripe price ID for monthly phone number subscriptions (required for billing)
- `NODE_ENV` - Controls logging behavior (logging disabled in production)

### Stripe Integration

The AI Phone system integrates with Stripe for phone number billing. When users purchase phone numbers through the workflow system, they're redirected to Stripe checkout.

The `STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID` should be set to your Stripe price ID that represents the monthly subscription cost for AI phone numbers. This price ID is created in your Stripe dashboard and determines how much customers are charged monthly for each phone number.

## Credit System and Billing

### Webhook-Based Credit Deduction

The AI Phone system automatically deducts credits from user or team accounts when calls are completed. This is handled by the webhook at `apps/web/app/api/webhooks/retellAI/route.ts`.

#### Credit Deduction Flow

```
1. AI Phone Call Completes
   ↓
2. Provider sends "call_analyzed" webhook
   ↓
3. Webhook verifies signature for security
   ↓
4. System looks up phone number owner (user/team)
   ↓
5. Calculates credits based on usage factors
   ↓
6. Verifies sufficient credits available
   ↓
7. Deducts credits from account
   ↓
8. Logs transaction for audit
```

#### Credit Calculation

Credits are deducted based on multiple factors including:

- **Call Duration**: Longer calls consume more credits
- **Prompt Complexity**: Advanced prompts and conversation templates affect cost
- **Voice Configuration**: Different voice models and settings impact pricing
- **Features Used**: Additional AI capabilities and tools increase credit usage

The system calculates the total cost and converts it to credits for deduction from the user or team account.

#### Webhook Setup

The webhook requires proper configuration:

1. **Webhook URL**: Add the webhook endpoint to your AI provider dashboard
2. **Environment Variables**: Set appropriate API keys for webhook verification
3. **Security**: Webhook signatures are verified to ensure authenticity

#### Credit Service Integration

The webhook integrates with Cal.com's credit system to check and deduct credits appropriately.

#### Error Handling

The webhook includes comprehensive error handling:

- **Invalid Signatures**: Returns 401 Unauthorized
- **Missing Phone Number**: Logs error, cannot deduct credits
- **Insufficient Credits**: Logs warning but doesn't block (call already completed)
- **Missing Cost Data**: Logs error and skips credit deduction

#### Supported Events

The webhook processes call completion events that contain the final usage data and cost information. Other events are acknowledged but not processed for billing purposes.

## Provider-Specific Documentation

- [Retell AI Provider](./providers/retellAI/README.md) - Complete Retell AI integration
- [Example Provider](./providers/example-future-provider/README.md) - Template for new providers

## Future Enhancements

- Multi-language template support
- Advanced workflow builder UI
- Provider health checks and automatic failover
- Real-time call monitoring and analytics
- Integration with Cal.com's webhook system
- Custom field type plugins
- Template marketplace and sharing
- Advanced agent training and optimization tools
- Integration with more AI service providers
- Voice cloning and customization options
