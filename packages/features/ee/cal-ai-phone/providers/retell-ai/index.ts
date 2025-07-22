export { RetellAIService } from "./service";
export { RetellAIProvider } from "./provider";
export { RetellAIProviderFactory } from "./factory";
export { RetellAIApiClient } from "./client";
export { RetellAIError } from "./errors";

export type {
  RetellAIRepository,
  CreateLLMRequest,
  CreateAgentRequest,
  UpdateLLMRequest,
  AIConfigurationSetup,
  AIConfigurationDeletion,
  DeletionResult,
} from "./types";

// ===== USAGE EXAMPLES =====
/*
// Using the provider abstraction
const factory = new RetellAIProviderFactory();
const provider = factory.create({ apiKey: "your-api-key" });

// Setup AI configuration
const { modelId, agentId } = await provider.setupConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
  eventTypeId: 12345,
});

// Update model configuration
await provider.updateModelConfiguration(modelId, {
  generalPrompt: "You are a helpful assistant...",
  beginMessage: "Hello, I'm calling to confirm your appointment...",
});

// Delete AI configuration with fault tolerance
const deletionResult = await provider.deleteConfiguration({
  modelId,
  agentId,
});

if (!deletionResult.success) {
  console.error("Deletion had errors:", deletionResult.errors);
} else {
  console.log("Successfully deleted AI configuration");
}

// Create phone call
const call = await provider.createPhoneCall({
  fromNumber: "+1234567890",
  toNumber: "+0987654321",
  dynamicVariables: {
    name: "John Doe",
    company: "Acme Corp",
    email: "john@acme.com",
  },
});

// Legacy usage (direct service access still supported)

const service = new RetellAIService(apiClient);

// Setup AI configuration
const { llmId, agentId } = await service.setupAIConfiguration({
  calApiKey: "cal_live_123...",
  timeZone: "America/New_York",
  eventTypeId: 12345,
});

// Update LLM
await service.updateLLMConfiguration(llmId, {
  generalPrompt: "You are a helpful assistant...",
  beginMessage: "Hello, I'm calling to confirm your appointment...",
});

// Delete AI configuration with fault tolerance
const deletionResult = await service.deleteAIConfiguration({
  llmId,
  agentId,
});

if (!deletionResult.success) {
  console.error("Deletion had errors:", deletionResult.errors);
} else {
  console.log("Successfully deleted AI configuration");
}

// Create phone call
const call = await service.createPhoneCall({
  fromNumber: "+1234567890",
  toNumber: "+0987654321",
  dynamicVariables: {
    name: "John Doe",
    company: "Acme Corp",
    email: "john@acme.com",
  },
});
*/
