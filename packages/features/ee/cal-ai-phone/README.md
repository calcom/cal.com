# Cal.com AI Phone Service Architecture

This package provides a comprehensive, provider-agnostic architecture for AI phone services in Cal.com, offering easy integration with different AI service providers, template management, and self-service UI components.

## Architecture Overview

The architecture follows the **Strategy Pattern**, **Factory Pattern**, and **Template Pattern** to provide a flexible, extensible, and user-friendly system:

```
┌─────────────────────────────────────────────┐
│              Client Code                    │
├─────────────────────────────────────────────┤
│        AI Phone Service Registry            │
├─────────────────────────────────────────────┤
│      AI Phone Service Provider Interface    │
├─────────────────────────────────────────────┤
│   Template System & UI Components           │
├─────────────────────────────────────────────┤
│  Provider Implementations (Retell AI, etc)  │
└─────────────────────────────────────────────┘
```

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

### 7. Legacy Support

- `retellAIService.ts` - Original service implementation (Command Pattern)
- Maintained for backward compatibility while new architecture is adopted

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

### Using Templates

```typescript
import { 
  templateFieldsMap, 
  getTemplateFieldsSchema,
  PROMPT_TEMPLATES 
} from "@calcom/features/ee/cal-ai-phone";

// Get template fields for CHECK_IN_APPOINTMENT
const fields = templateFieldsMap.CHECK_IN_APPOINTMENT;
console.log(fields); // Array of field definitions

// Get validation schema for template
const schema = getTemplateFieldsSchema({ templateType: "CHECK_IN_APPOINTMENT" });

// Use pre-defined prompt template
const prompt = PROMPT_TEMPLATES.CHECK_IN_APPOINTMENT?.generalPrompt;
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

### Using the Registry Directly

```typescript
import { AIPhoneServiceRegistry } from "@calcom/features/ee/cal-ai-phone";

// Get available providers
const providers = AIPhoneServiceRegistry.getAvailableProviders();
console.log("Available providers:", providers); // ["retell-ai"]

// Create a provider
const service = AIPhoneServiceRegistry.createProvider("retell-ai", {
  apiKey: "your-api-key",
  enableLogging: true,
});

// Set default provider
AIPhoneServiceRegistry.setDefaultProvider("retell-ai");
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

## Template System

The template system provides pre-configured conversation flows and dynamic field management:

### Available Templates

1. **CHECK_IN_APPOINTMENT**: For appointment check-in calls
   - Required field: `schedulerName`
   - Pre-configured prompt for appointment confirmations

2. **CUSTOM_TEMPLATE**: For fully customizable experiences
   - Fields: `generalPrompt`, `beginMessage`, `guestName`, `guestEmail`, `guestCompany`
   - Complete flexibility for custom use cases

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

## Migration Guide

### From Legacy Retell AI Service

**Before:**
```typescript
import { RetellAIService } from "@calcom/features/ee/cal-ai-phone/retellAIService";

const service = new RetellAIService(initProps);
const createdLLM = await service.createRetellLLMAndUpdateWebsocketUrl();
```

**After (New Architecture):**
```typescript
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";

const service = createDefaultAIPhoneServiceProvider();
const { llmId, agentId } = await service.setupConfiguration(config);
```

**After (Legacy Compatible):**
```typescript
import { LegacyRetellAIService } from "@calcom/features/ee/cal-ai-phone";

const service = new LegacyRetellAIService(initProps); // Still works
```

## Data Validation

The package uses Zod for comprehensive data validation:

```typescript
import { 
  createPhoneCallSchema,
  ZGetRetellLLMSchema,
  ZCreatePhoneSchema 
} from "@calcom/features/ee/cal-ai-phone";

// Validate phone call creation data
const validatedData = createPhoneCallSchema.parse(phoneCallData);

// Validate API responses
const llmResponse = ZGetRetellLLMSchema.parse(apiResponse);
```

## Self-Service UI Components

The package includes React components for self-service AI phone management:

```typescript
import { 
  CreateAgentStep,
  CreateWorkflowAgent,
  AgentsListPage 
} from "@calcom/features/ee/cal-ai-phone/components";

// Use in your React application
function MyAIPhonePage() {
  return (
    <div>
      <AgentsListPage />
      <CreateAgentStep 
        onComplete={(agent) => console.log('Agent created:', agent)}
      />
    </div>
  );
}
```

## Benefits

1. **Provider Independence**: Easy to switch between different AI service providers
2. **Template System**: Pre-configured conversation flows with customization options
3. **Self-Service UI**: Complete UI components for agent and phone number management
4. **Type Safety**: Comprehensive TypeScript types and Zod validation
5. **Extensibility**: Simple to add new providers, templates, and field types
6. **Testability**: Mock providers and template validation for testing
7. **Maintainability**: Clear separation of concerns and consistent interfaces
8. **Backward Compatibility**: Legacy code continues to work during migration
9. **Phone Number Management**: Complete CRUD operations for phone numbers
10. **Agent Management**: Full lifecycle management of AI agents

## Environment Variables

- `RETELL_AI_KEY` - API key for Retell AI (required when using Retell AI provider)
- `NODE_ENV` - Controls logging behavior (logging disabled in production)

## Provider-Specific Documentation

- [Retell AI Provider](./providers/retell-ai/README.md) - Complete Retell AI integration
- [Example Provider](./providers/example-future-provider/README.md) - Template for new providers

## API Reference

### Core Exports

```typescript
// Provider interfaces and types
export type {
  AIPhoneServiceProvider,
  AIPhoneServiceConfiguration,
  AIPhoneServiceCall,
  AIPhoneServiceAgent,
  AIPhoneServicePhoneNumber
} from "./interfaces/ai-phone-service.interface";

// Registry and factory functions
export {
  AIPhoneServiceRegistry,
  createAIPhoneServiceProvider,
  createDefaultAIPhoneServiceProvider
} from "./ai-phone-service-registry";

// Template system
export { 
  PROMPT_TEMPLATES,
  DEFAULT_PROMPT_VALUE,
  DEFAULT_BEGIN_MESSAGE 
} from "./promptTemplates";

export { templateFieldsMap } from "./template-fields-map";
export { getTemplateFieldsSchema } from "./getTemplateFieldsSchema";

// Validation schemas
export * from "./zod-utils";

// UI Components
export * from "./components";
```

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
