import { AIPhoneServiceRegistry } from "./AIPhoneServiceRegistry";
import { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";
import { RetellAIPhoneServiceProviderFactory } from "./providers/retellAI";

/**
 * Initialize the AI Phone Service Registry
 * This function should be called during application startup
 */
export function initializeAIPhoneServiceRegistry(): void {
  // Use Retell AI as the default provider
  const defaultProvider = AIPhoneServiceProviderType.RETELL_AI;

  // Build providers configuration - only Retell AI for now
  const providers = [
    {
      type: AIPhoneServiceProviderType.RETELL_AI,
      factory: new RetellAIPhoneServiceProviderFactory(),
    },
  ];

  // Initialize the registry
  AIPhoneServiceRegistry.initialize({
    defaultProvider,
    providers,
  });

  // Log initialization details in development
  if (process.env.NODE_ENV !== "production") {
    console.log("AI Phone Service Registry initialized:", {
      defaultProvider: AIPhoneServiceRegistry.getDefaultProvider(),
      availableProviders: AIPhoneServiceRegistry.getAvailableProviders(),
    });
  }
}

/**
 * Check if the registry needs initialization and initialize if needed
 * This is useful for ensuring the registry is ready before use
 */
export function ensureAIPhoneServiceRegistryInitialized(): void {
  if (!AIPhoneServiceRegistry.isInitialized()) {
    initializeAIPhoneServiceRegistry();
  }
}
