// Generic AI Phone Service Interfaces
export type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
  AIPhoneServiceConfiguration,
  AIPhoneServiceDeletion,
  AIPhoneServiceDeletionResult,
  AIPhoneServiceCallData,
  AIPhoneServiceModel,
  AIPhoneServiceAgent,
  AIPhoneServiceCall,
  AIPhoneServicePhoneNumber,
} from "./interfaces/ai-phone-service.interface";

export { AIPhoneServiceProviderType } from "./interfaces/ai-phone-service.interface";

// Registry System
export {
  AIPhoneServiceRegistry,
  createAIPhoneServiceProvider,
  createDefaultAIPhoneServiceProvider,
} from "./ai-phone-service-registry";

// Provider Implementations
export {
  RetellAIProvider,
  RetellAIProviderFactory,
  RetellAIService,
  RetellSDKClient,
  RetellAIError,
} from "./providers/retell-ai";

export type {
  RetellAIRepository,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateLLMRequest,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
} from "./providers/retell-ai";

// Legacy exports for backward compatibility
export { RetellAIService as LegacyRetellAIService } from "./retellAIService";

// Provider-agnostic utilities
export { handleCreateSelfServePhoneCall } from "./handleCreateSelfServePhoneCall";

// Other exports
export { DEFAULT_PROMPT_VALUE, DEFAULT_BEGIN_MESSAGE, PROMPT_TEMPLATES } from "./promptTemplates";
export { getTemplateFieldsSchema } from "./getTemplateFieldsSchema";
export { templateFieldsMap } from "./template-fields-map";

// Re-export zod schemas
export * from "./zod-utils";

// ===== USAGE EXAMPLES =====
/*
// Recommended usage with provider abstraction
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

// Using a specific provider
import { createAIPhoneServiceProvider, AIPhoneServiceProviderType } from "@calcom/features/ee/cal-ai-phone";

const retellAIService = createAIPhoneServiceProvider(AIPhoneServiceProviderType.RETELL_AI, {
  apiKey: "your-retell-ai-key",
  enableLogging: true,
});

// Legacy usage (still supported)
import { RetellAIServiceFactory } from "@calcom/features/ee/cal-ai-phone";

const legacyService = RetellAIServiceFactory.create();
*/
