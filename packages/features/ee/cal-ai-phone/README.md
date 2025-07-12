# Cal.com AI Phone Service Architecture

This package provides a provider-agnostic architecture for AI phone services in Cal.com, allowing easy integration with different AI service providers.

## Architecture Overview

The architecture follows the **Strategy Pattern** and **Factory Pattern** to provide a flexible and extensible system:

```
┌─────────────────────────────────────────────┐
│              Client Code                    │
├─────────────────────────────────────────────┤
│        AI Phone Service Registry            │
├─────────────────────────────────────────────┤
│      AI Phone Service Provider Interface    │
├─────────────────────────────────────────────┤
│  Provider Implementations (Retell AI, etc)  │
└─────────────────────────────────────────────┘
```

## Key Components

### 1. Generic Interfaces (`interfaces/ai-phone-service.interface.ts`)

- `AIPhoneServiceProvider` - Main interface that all providers must implement
- `AIPhoneServiceConfiguration` - Configuration for setting up AI services
- `AIPhoneServiceProviderFactory` - Factory interface for creating providers
- Common data types (`AIPhoneServiceModel`, `AIPhoneServiceCall`, etc.)

### 2. Provider Registry (`ai-phone-service-registry.ts`)

- `AIPhoneServiceRegistry` - Central registry for managing providers
- `createAIPhoneServiceProvider()` - Helper function to create providers
- `createDefaultAIPhoneServiceProvider()` - Convenience function for default provider

### 3. Provider Implementations (`providers/`)

- `retell-ai/` - Retell AI implementation
- `example-future-provider/` - Example showing how to add new providers

## Usage Examples

### Using the Default Provider (Recommended)

```typescript
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";

const aiPhoneService = createDefaultAIPhoneServiceProvider();

// Setup AI configuration
const { modelId, agentId } = await aiPhoneService.setupConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
  eventTypeId: 12345,
});

// Create phone call
const call = await aiPhoneService.createPhoneCall({
  fromNumber: "+1234567890",
  toNumber: "+0987654321",
  dynamicVariables: {
    name: "John Doe",
    company: "Acme Corp",
    email: "john@acme.com",
  },
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
```

### Using the Registry Directly

```typescript
import { AIPhoneServiceRegistry } from "@calcom/features/ee/cal-ai-phone";

// Get available providers
const providers = AIPhoneServiceRegistry.getAvailableProviders();
console.log("Available providers:", providers);

// Create a provider
const service = AIPhoneServiceRegistry.createProvider("retell-ai", {
  apiKey: "your-api-key",
  enableLogging: true,
});

// Set default provider
AIPhoneServiceRegistry.setDefaultProvider("retell-ai");
```

## Adding New Providers

Adding a new AI service provider is straightforward:

### 1. Create Provider Implementation

```typescript
// providers/new-provider/provider.ts
import type { AIPhoneServiceProvider } from "../../interfaces/ai-phone-service.interface";

export class NewAIProvider implements AIPhoneServiceProvider {
  // Implement all required methods
  async setupConfiguration(config) {
    // Your implementation
  }
  
  async createPhoneCall(data) {
    // Your implementation
  }
  
  // ... other methods
}
```

### 2. Create Factory

```typescript
// providers/new-provider/factory.ts
import type { AIPhoneServiceProviderFactory } from "../../interfaces/ai-phone-service.interface";

export class NewAIProviderFactory implements AIPhoneServiceProviderFactory {
  create(config) {
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

## Migration Guide

### From Legacy Retell AI Service

If you're using the legacy `RetellAIService` or `RetellAIServiceFactory`, you can migrate to the new architecture:

**Before:**
```typescript
import { RetellAIServiceFactory } from "@calcom/features/ee/cal-ai-phone/retell-ai";

const service = RetellAIServiceFactory.create();
const { llmId, agentId } = await service.setupAIConfiguration(config);
```

**After:**
```typescript
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";

const service = createDefaultAIPhoneServiceProvider();
const { modelId, agentId } = await service.setupConfiguration(config);
```

### Backward Compatibility

The legacy services are still available for backward compatibility:

```typescript
// Still works - legacy imports
import { RetellAIServiceFactory } from "@calcom/features/ee/cal-ai-phone/providers/retell-ai";
import { RetellAIService } from "@calcom/features/ee/cal-ai-phone/providers/retell-ai";
```

## Benefits

1. **Provider Independence**: Easy to switch between different AI service providers
2. **Extensibility**: Simple to add new providers without changing existing code
3. **Testability**: Mock providers can be easily created for testing
4. **Maintainability**: Clear separation of concerns and consistent interfaces
5. **Backward Compatibility**: Legacy code continues to work while new code can use the improved architecture

## Environment Variables

- `RETELL_AI_KEY` - API key for Retell AI (required when using Retell AI provider)
- `NODE_ENV` - Controls logging behavior (logging disabled in production)

## Provider-Specific Documentation

- [Retell AI Provider](./providers/retell-ai/README.md)
- [Example Provider](./providers/example-future-provider/README.md)

## Future Enhancements

- Configuration-based provider selection
- Provider health checks and failover
- Provider-specific metrics and monitoring
- Dynamic provider registration from configuration files 
