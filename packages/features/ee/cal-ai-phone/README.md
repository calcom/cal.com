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

### 1. Generic Interfaces (`interfaces/ai-phone-service.interface.ts`)

- `AIPhoneServiceProvider` - Main interface that all providers must implement
- `AIPhoneServiceConfiguration` - Configuration for setting up AI services
- `AIPhoneServiceProviderFactory` - Factory interface for creating providers
- Common data types (`AIPhoneServiceModel`, `AIPhoneServiceCall`, `AIPhoneServiceAgent`, etc.)
- Phone number management interfaces
- Agent and LLM management interfaces

### 2. Provider Registry (`ai-phone-service-registry.ts`)

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

- `retell-ai/` - Complete Retell AI implementation with:
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
  - `AgentRepository` - Manages agent data access
  - `PhoneNumberRepository` - Handles phone number operations
- **Service Classes** (`providers/retell-ai/RetellAIService.ts`)
  - Business logic orchestration
  - External API integration
- **Mapper Functions**
  - Transform between database models and DTOs
  - Handle data serialization/deserialization

## Architecture Patterns in Detail

### Repository Pattern

The repository pattern provides an abstraction layer over data access, making the system database-agnostic and testable.

```typescript
// AgentRepository example
export class AgentRepository {
  // Encapsulates complex queries with access control
  static async findManyWithUserAccess({
    userId,
    teamId,
    scope = "all"
  }: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }) {
    // Pre-fetch accessible teams for performance
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);
    
    // Build optimized query based on scope
    // Returns agents with proper access control
  }
  
  // Single responsibility: data access only
  static async create(data: CreateAgentData) {
    return await prisma.agent.create({ data });
  }
}
```

**Benefits:**
- **Separation of Concerns**: Business logic separated from data access
- **Testability**: Easy to mock for unit tests
- **Flexibility**: Can switch between Prisma ORM and raw SQL
- **Reusability**: Common queries centralized in one place

### Factory Pattern

The factory pattern enables dynamic creation of provider instances without exposing instantiation logic.

```typescript
// Provider Factory Interface
export interface AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider;
}

// Concrete Factory Implementation
export class RetellAIProviderFactory implements AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    // Validates configuration
    // Creates appropriate provider instance
    // Handles initialization logic
    return new RetellAIProvider(config);
  }
}

// Usage through registry
const provider = AIPhoneServiceRegistry.createProvider("retell-ai", config);
```

**Benefits:**
- **Loose Coupling**: Client code doesn't depend on concrete classes
- **Extensibility**: Easy to add new providers
- **Configuration Management**: Centralized provider setup

### Service Pattern

Service layer orchestrates business operations and coordinates between multiple repositories and external services.

```typescript
// AI Phone Service coordinating multiple operations
export class AIPhoneService {
  async setupAgentWithPhoneNumber(config: SetupConfig) {
    // 1. Create AI agent via provider
    const agent = await this.provider.createAgent(config.agentConfig);
    
    // 2. Store in database via repository
    const savedAgent = await AgentRepository.create({
      ...agent,
      userId: config.userId
    });
    
    // 3. Provision phone number
    const phoneNumber = await this.provider.createPhoneNumber({
      areaCode: config.areaCode
    });
    
    // 4. Link phone number to agent
    await PhoneNumberRepository.updateAgents({
      id: phoneNumber.id,
      outboundRetellAgentId: savedAgent.retellAgentId
    });
    
    // 5. Return complete setup
    return { agent: savedAgent, phoneNumber };
  }
}
```

**Benefits:**
- **Business Logic Encapsulation**: Complex operations in one place
- **Transaction Management**: Coordinates multiple operations
- **Reusability**: Common workflows available to all consumers

### Registry Pattern

The registry pattern manages provider registration and lookup, acting as a service locator.

```typescript
export class AIPhoneServiceRegistry {
  private static providers = new Map<string, AIPhoneServiceProviderFactory>();
  private static defaultProvider: string = "retell-ai";
  
  static registerProvider(name: string, factory: AIPhoneServiceProviderFactory) {
    this.providers.set(name, factory);
  }
  
  static createProvider(name: string, config: any): AIPhoneServiceProvider {
    const factory = this.providers.get(name);
    if (!factory) {
      throw new Error(`Provider ${name} not found`);
    }
    return factory.create(config);
  }
  
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

**Benefits:**
- **Dynamic Provider Management**: Add/remove providers at runtime
- **Centralized Configuration**: Single point for provider management
- **Dependency Injection**: Supports IoC principles

### Mapper Pattern

Mappers transform data between different representations (database models, DTOs, API responses).

```typescript
// Transform raw database result to domain model
export class AgentMapper {
  static toDomain(dbAgent: PrismaAgent): DomainAgent {
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      retellAgentId: dbAgent.retellAgentId,
      // Transform nested relations
      phoneNumbers: dbAgent.phoneNumbers?.map(PhoneNumberMapper.toDomain) || [],
      // Add computed properties
      isActive: dbAgent.enabled && dbAgent.subscriptionStatus === 'ACTIVE'
    };
  }
  
  static toDTO(domain: DomainAgent): AgentDTO {
    return {
      id: domain.id,
      name: domain.name,
      // Flatten for API response
      phoneNumberCount: domain.phoneNumbers.length,
      status: domain.isActive ? 'active' : 'inactive'
    };
  }
}
```

**Benefits:**
- **Data Transformation**: Clean separation between layers
- **Flexibility**: Different representations for different contexts
- **Maintainability**: Changes in one layer don't affect others

### Strategy Pattern

The strategy pattern allows switching between different AI providers seamlessly.

```typescript
// Common interface for all providers
export interface AIPhoneServiceProvider {
  setupConfiguration(config: AIPhoneServiceConfiguration): Promise<SetupResult>;
  createPhoneCall(data: CallData): Promise<Call>;
  createAgent(data: AgentData): Promise<Agent>;
  // ... other common operations
}

// Different provider implementations
export class RetellAIProvider implements AIPhoneServiceProvider {
  async createPhoneCall(data: CallData): Promise<Call> {
    // Retell-specific implementation
    return await this.retellClient.createCall(data);
  }
}

export class TwilioAIProvider implements AIPhoneServiceProvider {
  async createPhoneCall(data: CallData): Promise<Call> {
    // Twilio-specific implementation
    return await this.twilioClient.calls.create(data);
  }
}
```

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

AI Phone calls are configured as workflow steps with specific triggers:

```typescript
// Workflow Step Definition
export interface AIPhoneWorkflowStep {
  id: number;
  stepNumber: number;
  action: WorkflowActions.AI_PHONE_CALL;
  template: "CHECK_IN_APPOINTMENT" | "CUSTOM_TEMPLATE";
  agentId: string; // AI agent to handle the call
  sendTo: string; // Phone number to call
  trigger: WorkflowTriggerEvents; // When to make the call
  time: number; // Minutes before/after event
  timeUnit: TimeUnit;
}
```

### Supported Workflow Triggers

AI Phone calls can be triggered by various workflow events:

- **BEFORE_EVENT**: Call attendees before appointments
- **AFTER_EVENT**: Follow up after meetings
- **NEW_EVENT**: Welcome calls for new bookings
- **RESCHEDULE_EVENT**: Notify about schedule changes
- **CANCELLED_EVENT**: Handle cancellation calls

### Example: Appointment Reminder Workflow

```typescript
// 1. Create an AI Agent for appointment reminders
const agent = await AgentRepository.create({
  name: "Appointment Reminder Agent",
  templateType: "CHECK_IN_APPOINTMENT",
  userId: user.id,
  // Agent configured with appointment check-in template
});

// 2. Link Agent to Workflow Step
await prisma.workflowStep.create({
  data: {
    workflowId: workflow.id,
    action: WorkflowActions.AI_PHONE_CALL,
    stepNumber: 1,
    agentId: agent.id,
    template: "CHECK_IN_APPOINTMENT",
    trigger: WorkflowTriggerEvents.BEFORE_EVENT,
    time: 24, // 24 hours before
    timeUnit: TimeUnit.HOUR,
  }
});

// 3. When workflow triggers, system executes AI phone call
export async function executeAIPhoneCall(workflowStep: WorkflowStep, booking: Booking) {
  const aiService = createDefaultAIPhoneServiceProvider();
  
  // Get phone number from booking attendee
  const phoneNumber = booking.attendees[0]?.phoneNumber;
  
  // Dynamic variables for the call
  const dynamicVariables = {
    guestName: booking.attendees[0]?.name,
    eventName: booking.eventType?.title,
    eventDate: booking.startTime.toISOString(),
    schedulerName: booking.user?.name,
  };
  
  // Execute the AI phone call
  const call = await aiService.createPhoneCall({
    from_number: workflowStep.agent.phoneNumber,
    to_number: phoneNumber,
    retell_llm_dynamic_variables: dynamicVariables,
  });
  
  // Log call for workflow tracking
  await prisma.workflowReminder.update({
    where: { id: workflowReminder.id },
    data: { referenceId: call.call_id }
  });
}
```

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

To prevent abuse, workflow AI calls are rate-limited:

```typescript
// Rate limiting check in workflow execution
await checkRateLimitAndThrowError({
  rateLimitingType: "core",
  identifier: `ai-phone-call:${userId}`,
});
```

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

### Using the Default Provider (Recommended)

```typescript
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";

const aiPhoneService = createDefaultAIPhoneServiceProvider();

// Setup AI configuration
const { llmId, agentId } = await aiPhoneService.setupConfiguration({
  generalPrompt: "Your AI assistant prompt...",
  beginMessage: "Hi! How can I help you today?",
  calApiKey: "cal_live_123...",
  eventTypeId: 12345,
  loggedInUserTimeZone: "America/New_York",
  generalTools: [
    {
      type: "check_availability_cal",
      name: "check_availability",
      cal_api_key: "your-cal-api-key",
      event_type_id: 12345,
      timezone: "America/New_York"
    }
  ]
});

// Create phone call
const call = await aiPhoneService.createPhoneCall({
  fromNumber: "+1234567890",
  toNumber: "+0987654321",
  retellLlmDynamicVariables: {
    name: "John Doe",
    company: "Acme Corp",
    email: "john@acme.com"
  }
});
```

### Using a Specific Provider

```typescript
import { 
  createAIPhoneServiceProvider, 
  AIPhoneServiceProviderType 
} from "@calcom/features/ee/cal-ai-phone";

const retellAIService = createAIPhoneServiceProvider(
  AIPhoneServiceProviderType.RETELL_AI,
  {
    apiKey: "your-retell-ai-key",
    enableLogging: true,
  }
);

// Full provider API available
const agent = await retellAIService.getAgent("agent-id");
const phoneNumber = await retellAIService.createPhoneNumber({
  areaCode: 415,
  nickname: "Sales Line"
});
```


### Phone Number Management

```typescript
const aiPhoneService = createDefaultAIPhoneServiceProvider();

// Create a new phone number
const phoneNumber = await aiPhoneService.createPhoneNumber({
  areaCode: 415,
  nickname: "Support Line"
});

// Update phone number configuration
const updatedNumber = await aiPhoneService.updatePhoneNumber("+14155551234", {
  nickname: "Updated Support Line",
  inboundAgentId: "agent-123"
});

// Import existing phone number
const importedNumber = await aiPhoneService.importPhoneNumber({
  phoneNumber: "+14155559999",
  nickname: "Imported Line",
  userId: 123
});

// Delete phone number
await aiPhoneService.deletePhoneNumber({ 
  phoneNumber: "+14155551234", 
  userId: 123,
  deleteFromDB: true 
});
```

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

Adding a new AI service provider follows the established pattern:

### 1. Create Provider Implementation

```typescript
// providers/new-provider/provider.ts
import type { AIPhoneServiceProvider } from "../../interfaces/ai-phone-service.interface";

export class NewAIProvider implements AIPhoneServiceProvider {
  constructor(private config: AIPhoneServiceProviderConfig) {}

  async setupConfiguration(config: AIPhoneServiceConfiguration) {
    // Implementation for setting up LLM and agent
    return { llmId: "new-llm-id", agentId: "new-agent-id" };
  }
  
  async createPhoneCall(data: AIPhoneServiceCallData) {
    // Implementation for creating phone calls
    return { callId: "new-call-id", /* other properties */ };
  }
  
  async createPhoneNumber(data: AIPhoneServiceCreatePhoneNumberParams) {
    // Implementation for phone number management
  }
  
  // ... implement all required methods
}
```

### 2. Create Factory

```typescript
// providers/new-provider/factory.ts
import type { AIPhoneServiceProviderFactory } from "../../interfaces/ai-phone-service.interface";

export class NewAIProviderFactory implements AIPhoneServiceProviderFactory {
  create(config: AIPhoneServiceProviderConfig): AIPhoneServiceProvider {
    return new NewAIProvider(config);
  }
}
```

### 3. Register Provider

```typescript
import { AIPhoneServiceRegistry } from "@calcom/features/ee/cal-ai-phone";
import { NewAIProviderFactory } from "./providers/new-provider";

AIPhoneServiceRegistry.registerProvider(
  "new-provider",
  new NewAIProviderFactory()
);
```

### 4. Update Provider Types

```typescript
// interfaces/ai-phone-service.interface.ts
export enum AIPhoneServiceProviderType {
  RETELL_AI = "retell-ai",
  NEW_PROVIDER = "new-provider", // Add new provider
}
```



## Environment Variables

- `RETELL_AI_KEY` - API key for Retell AI (required when using Retell AI provider)
- `STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID` - Stripe price ID for monthly phone number subscriptions (required for billing)
- `NODE_ENV` - Controls logging behavior (logging disabled in production)

### Stripe Integration

The AI Phone system integrates with Stripe for phone number billing. When users purchase phone numbers through the workflow system, they're redirected to Stripe checkout:

```typescript
// Phone number purchase flow
const checkoutSession = await aiService.generatePhoneNumberCheckoutSession({
  userId,
  teamId: input?.teamId,
  agentId: input?.agentId,
  workflowId: input?.workflowId,
});

// Returns Stripe checkout URL
return {
  checkoutUrl: checkoutSession.url,
  message: checkoutSession.message,
};
```

The `STRIPE_PHONE_NUMBER_MONTHLY_PRICE_ID` should be set to your Stripe price ID that represents the monthly subscription cost for AI phone numbers. This price ID is created in your Stripe dashboard and determines how much customers are charged monthly for each phone number.

## Credit System and Billing

### Webhook-Based Credit Deduction

The AI Phone system automatically deducts credits from user or team accounts when calls are completed. This is handled by the webhook at `apps/web/app/api/webhooks/retell-ai/route.ts`.

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

The webhook integrates with Cal.com's credit system:

```typescript
const creditService = new CreditService();

// Check if user/team has sufficient credits
const hasCredits = await creditService.hasAvailableCredits({ userId, teamId });

// Deduct credits after call completion
await creditService.chargeCredits({
  userId: userId ?? undefined,
  teamId: teamId ?? undefined, 
  credits: creditsToDeduct,
});
```

#### Error Handling

The webhook includes comprehensive error handling:

- **Invalid Signatures**: Returns 401 Unauthorized
- **Missing Phone Number**: Logs error, cannot deduct credits
- **Insufficient Credits**: Logs warning but doesn't block (call already completed)
- **Missing Cost Data**: Logs error and skips credit deduction

#### Supported Events

The webhook processes call completion events that contain the final usage data and cost information. Other events are acknowledged but not processed for billing purposes.

## Provider-Specific Documentation

- [Retell AI Provider](./providers/retell-ai/README.md) - Complete Retell AI integration
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
