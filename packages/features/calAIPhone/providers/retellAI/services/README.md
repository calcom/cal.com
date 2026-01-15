# RetellAI Services Architecture

This directory contains the refactored RetellAI services that follow the Single Responsibility Principle (SRP) to fix the previous GOD CLASS violation.

## Architecture Overview

**BEFORE**: Single `RetellAIService` class (849 lines) handling all responsibilities
**AFTER**: Focused services composed together (~150 lines each)

## Services

### 1. AIConfigurationService

**Responsibility**: LLM and Agent configuration management

- `setupAIConfiguration()` - Create LLM and Agent
- `deleteAIConfiguration()` - Clean up AI resources
- `updateLLMConfiguration()` - Update LLM settings
- `getLLMDetails()` - Retrieve LLM information

### 2. AgentService

**Responsibility**: Agent CRUD operations

- `createOutboundAgent()` - Create new agents
- `updateAgent()` - Update agent properties
- `deleteAgent()` - Remove agents
- `listAgents()` - Get agent lists
- `getAgentWithDetails()` - Get detailed agent info

### 3. BillingService

**Responsibility**: Stripe payments and subscriptions

- `generatePhoneNumberCheckoutSession()` - Create Stripe checkout
- `cancelPhoneNumberSubscription()` - Cancel subscriptions

### 4. CallService

**Responsibility**: Phone call operations

- `createPhoneCall()` - Initiate calls
- `createTestCall()` - Create test calls with credit validation

### 5. PhoneNumberService

**Responsibility**: Phone number management with transaction integrity

- `importPhoneNumber()` - Import with compensating transactions
- `deletePhoneNumber()` - Remove phone numbers
- `updatePhoneNumberWithAgents()` - Assign agents
- Includes billing leak protection and compensation failure handling

## Usage Examples

### Direct Service Usage (Advanced)

```typescript
import {
  AIConfigurationService,
  AgentService,
  BillingService,
  CallService,
  PhoneNumberService
} from './services';

// Initialize dependencies
const repository = new RetellSDKClient({ apiKey: 'your-key' });
const agentRepository = new PrismaAgentRepositoryAdapter();
const phoneNumberRepository = new PrismaPhoneNumberRepositoryAdapter();
const transactionManager = new PrismaTransactionAdapter();

// Use individual services
const aiConfigService = new AIConfigurationService(repository);
const agentService = new AgentService(repository, agentRepository);
const billingService = new BillingService(phoneNumberRepository, repository);

// Setup AI configuration
const { llmId, agentId } = await aiConfigService.setupAIConfiguration({
  calApiKey: 'cal_live_123...',
  timeZone: 'America/New_York',
  eventTypeId: 12345,
});

// Create agent
const agent = await agentService.createOutboundAgent({
  name: 'Support Agent',
  userId: 1,
  userTimeZone: 'America/New_York',
  setupAIConfiguration: () => aiConfigService.setupAIConfiguration({...})
});
```

### Main Service Usage (Recommended)

```typescript
import { RetellAIService } from "../RetellAIService";

// Initialize main service
const service = new RetellAIService(repository, agentRepository, phoneNumberRepository, transactionManager);

// Use composed interface - same as before but internally organized
const { llmId, agentId } = await service.setupAIConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
});

const phoneNumber = await service.importPhoneNumber({
  phone_number: "+1234567890",
  termination_uri: "https://example.com/webhook",
  userId: 1,
  agentId: "agent-123",
});
```

## Benefits

✅ **Single Responsibility** - Each service has one clear purpose  
✅ **Easier Testing** - Test services in isolation with focused mocks  
✅ **Better Maintainability** - Changes to billing don't affect phone operations  
✅ **Reusability** - Compose services differently for different use cases  
✅ **Code Navigation** - ~150 lines per service vs 849 lines  
✅ **Backward Compatibility** - Existing code continues to work

## Testing

Each service can be tested independently:

```typescript
// Test individual service
const aiConfigService = new AIConfigurationService(mockRepository);
await aiConfigService.setupAIConfiguration(config);

// Test main service with all composed services
const service = new RetellAIService(mockRepository, mockAgentRepo, mockPhoneRepo, mockTransaction);
```

## Migration Guide

**For new code**: Use `RetellAIService` or individual services for specific needs
**For existing code**: No changes needed - `RetellAIService` maintains same API

The refactoring eliminates the GOD CLASS antipattern while preserving all functionality and improving code organization.
