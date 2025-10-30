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
} from "./interfaces/AIPhoneService.interface";

export { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";

// Registry System
export {
  AIPhoneServiceRegistry,
  createAIPhoneServiceProvider,
  createDefaultAIPhoneServiceProvider,
} from "./AIPhoneServiceRegistry";

// Registry Initialization
export {
  initializeAIPhoneServiceRegistry,
  ensureAIPhoneServiceRegistryInitialized,
} from "./initializeRegistry";

// Provider Implementations
export {
  RetellAIPhoneServiceProvider,
  RetellAIPhoneServiceProviderFactory,
  RetellAIService,
  RetellSDKClient,
  RetellAIError,
} from "./providers/retellAI";

export type {
  RetellAIRepository,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateLLMRequest,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellCallListParams,
  RetellCallListResponse,
} from "./providers/retellAI";

// Legacy exports for backward compatibility
export { RetellAIService as LegacyRetellAIService } from "./retellAIService";

// Other exports
export { DEFAULT_PROMPT_VALUE, DEFAULT_BEGIN_MESSAGE, PROMPT_TEMPLATES } from "./promptTemplates";
export { getTemplateFieldsSchema } from "./getTemplateFieldsSchema";
export { templateFieldsMap } from "./template-fields-map";

// Re-export zod schemas
export * from "./zod-utils";

// ===== USAGE EXAMPLES =====
/*
// Recommended usage with provider abstraction
import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";

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
import { createAIPhoneServiceProvider, AIPhoneServiceProviderType } from "@calcom/features/calAIPhone";

const retellAIService = createAIPhoneServiceProvider({
  providerType: AIPhoneServiceProviderType.RETELL_AI,
  config: {
    apiKey: "your-retell-ai-key",
    enableLogging: true,
  }
});

// Legacy usage (still supported)
import { RetellAIPhoneServiceProviderFactory } from "@calcom/features/calAIPhone";

const legacyService = RetellAIPhoneServiceProviderFactory.createWithConfig();
*/
