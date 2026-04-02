// Generic AI Phone Service Interfaces

// Registry System
export {
  AIPhoneServiceRegistry,
  createAIPhoneServiceProvider,
  createDefaultAIPhoneServiceProvider,
} from "./AIPhoneServiceRegistry";
export { getTemplateFieldsSchema } from "./getTemplateFieldsSchema";
// Registry Initialization
export {
  ensureAIPhoneServiceRegistryInitialized,
  initializeAIPhoneServiceRegistry,
} from "./initializeRegistry";
export type {
  AIPhoneServiceAgent,
  AIPhoneServiceCall,
  AIPhoneServiceCallData,
  AIPhoneServiceConfiguration,
  AIPhoneServiceDeletion,
  AIPhoneServiceDeletionResult,
  AIPhoneServiceModel,
  AIPhoneServicePhoneNumber,
  AIPhoneServiceProvider,
  AIPhoneServiceProviderConfig,
  AIPhoneServiceProviderFactory,
} from "./interfaces/AIPhoneService.interface";
export { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";
// Other exports
export { DEFAULT_BEGIN_MESSAGE, DEFAULT_PROMPT_VALUE, PROMPT_TEMPLATES } from "./promptTemplates";
export type {
  AIConfigurationDeletion,
  AIConfigurationSetup,
  CreateAgentRequest,
  CreateLLMRequest,
  DeletionResult,
  RetellAIRepository,
  RetellCallListParams,
  RetellCallListResponse,
  UpdateLLMRequest,
} from "./providers/retellAI";
// Provider Implementations
export {
  RetellAIError,
  RetellAIPhoneServiceProvider,
  RetellAIPhoneServiceProviderFactory,
  RetellAIService,
  RetellSDKClient,
} from "./providers/retellAI";
// Legacy exports for backward compatibility
export { RetellAIService as LegacyRetellAIService } from "./retellAIService";
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
