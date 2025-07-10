export { RetellAIService } from "./service";
export { RetellAIServiceFactory } from "./factory";
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
// Basic usage
import { RetellAIServiceFactory } from "@calcom/features/ee/cal-ai-phone/retell-ai";

const service = RetellAIServiceFactory.create();

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
