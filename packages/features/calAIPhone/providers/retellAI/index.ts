import type {
  RetellAIRepository,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateLLMRequest,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellLLM,
  RetellAgent,
  RetellCall,
  CreatePhoneCallParams,
  RetellPhoneNumber,
  UpdatePhoneNumberParams,
  CreatePhoneNumberParams,
  ImportPhoneNumberParams,
  UpdateAgentRequest,
  RetellLLMGeneralTools,
  RetellAgentWithDetails,
  Language,
  RetellDynamicVariables,
  RetellCallListParams,
  RetellCallListResponse,
  RetellVoice,
} from "./types";

export { RetellAIService } from "./RetellAIService";

export { AIConfigurationService } from "./services/AIConfigurationService";
export { AgentService } from "./services/AgentService";
export { BillingService } from "./services/BillingService";
export { CallService } from "./services/CallService";
export { PhoneNumberService } from "./services/PhoneNumberService";
export { VoiceService } from "./services/VoiceService";

export { RetellAIPhoneServiceProvider } from "./RetellAIPhoneServiceProvider";
export { RetellAIPhoneServiceProviderFactory } from "./RetellAIPhoneServiceProviderFactory";
export { RetellSDKClient } from "./RetellSDKClient";
export { RetellAIError } from "./errors";
export { PrismaAgentRepositoryAdapter } from "../adapters/PrismaAgentRepositoryAdapter";
export { PrismaPhoneNumberRepositoryAdapter } from "../adapters/PrismaPhoneNumberRepositoryAdapter";
export { PrismaTransactionAdapter } from "../adapters/PrismaTransactionAdapter";
export type { AgentRepositoryInterface } from "../interfaces/AgentRepositoryInterface";
export type { PhoneNumberRepositoryInterface } from "../interfaces/PhoneNumberRepositoryInterface";
export type { TransactionInterface } from "../interfaces/TransactionInterface";

export type {
  RetellAIRepository,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateLLMRequest,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
  RetellLLM,
  RetellAgent,
  RetellCall,
  CreatePhoneCallParams,
  RetellPhoneNumber,
  UpdatePhoneNumberParams,
  CreatePhoneNumberParams,
  ImportPhoneNumberParams,
  UpdateAgentRequest,
  RetellLLMGeneralTools,
  RetellAgentWithDetails,
  Language,
  RetellDynamicVariables,
  RetellCallListParams,
  RetellCallListResponse,
  RetellVoice,
};

export interface RetellAIPhoneServiceProviderTypeMap {
  Configuration: AIConfigurationSetup;
  UpdateModelParams: UpdateLLMRequest;
  Model: RetellLLM;
  Agent: RetellAgent;
  Call: RetellCall;
  PhoneNumber: RetellPhoneNumber;
  UpdatePhoneNumberParams: UpdatePhoneNumberParams;
  CreatePhoneNumberParams: CreatePhoneNumberParams;
  ImportPhoneNumberParams: ImportPhoneNumberParams;
  UpdateAgentParams: UpdateAgentRequest;
  Tools: RetellLLMGeneralTools;
  CreatePhoneCallParams: { fromNumber: string; toNumber: string; dynamicVariables?: RetellDynamicVariables };
  AgentWithDetails: RetellAgentWithDetails;
  ListCallsParams: RetellCallListParams;
  ListCallsResponse: RetellCallListResponse;
  Voice: RetellVoice;
}

// ===== USAGE EXAMPLES =====
/*
// REFACTORED ARCHITECTURE - Multiple usage patterns available:

// 1. BACKWARD COMPATIBLE - Existing code works unchanged
import { RetellAIService } from '@calcom/features/calAIPhone/providers/retellAI';

const service = new RetellAIService(
  repository,
  agentRepository,
  phoneNumberRepository,
  transactionManager
);

// Same API as before - internally uses focused services
const { llmId, agentId } = await service.setupAIConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
  eventTypeId: 12345,
});

const phoneNumber = await service.importPhoneNumber({
  phone_number: "+1234567890",
  termination_uri: "https://example.com/webhook",
  userId: 1,
});

// 2. FOCUSED SERVICE USAGE - Recommended for new modular code
import { RetellAIService } from '@calcom/features/calAIPhone/providers/retellAI';

const service = new RetellAIService(
  repository,
  agentRepository,
  phoneNumberRepository,
  transactionManager
);

// Main service now directly uses focused services internally
const result = await service.importPhoneNumber(phoneNumberData);

// 3. INDIVIDUAL SERVICES - Advanced usage for specific needs
import {
  AIConfigurationService,
  PhoneNumberService,
  BillingService
} from '@calcom/features/calAIPhone/providers/retellAI';

// Use only what you need
const aiConfigService = new AIConfigurationService(repository);
const phoneService = new PhoneNumberService(
  repository,
  agentRepository,
  phoneNumberRepository,
  transactionManager
);

const { llmId, agentId } = await aiConfigService.setupAIConfiguration(config);
const phoneNumber = await phoneService.importPhoneNumber(phoneData);

// 4. PROVIDER ABSTRACTION - Highest level interface
const factory = new RetellAIProviderFactory();
const provider = factory.create({ apiKey: "your-api-key" });

const { modelId, agentId } = await provider.setupConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
});

// Benefits of the refactored architecture:
// ✅ Single Responsibility - Each service has one clear purpose
// ✅ Easier Testing - Test services in isolation
// ✅ Better Maintainability - Changes to billing don't affect phone operations
// ✅ Reusability - Compose services differently for different use cases
// ✅ Code Navigation - ~150 lines per service vs 849 lines in god class
// ✅ Backward Compatibility - All existing code continues to work

// BEFORE: 849-line god class mixing all responsibilities
// AFTER: 5 focused services composed in main service = Clean architecture
*/
