import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  AIPhoneServiceRegistry,
  createAIPhoneServiceProvider,
  createDefaultAIPhoneServiceProvider,
} from "./AIPhoneServiceRegistry";
import type {
  AIPhoneServiceProvider,
  AIPhoneServiceProviderFactory,
  AIPhoneServiceProviderConfig,
} from "./interfaces/AIPhoneService.interface";
import { AIPhoneServiceProviderType } from "./interfaces/AIPhoneService.interface";

// Mock environment variables
vi.stubEnv("RETELL_AI_KEY", "test-api-key");

vi.mock("./providers/retellAI", () => ({
  RetellAIPhoneServiceProviderFactory: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockReturnValue({
      setupConfiguration: vi.fn(),
      createPhoneCall: vi.fn(),
      createPhoneNumber: vi.fn(),
    }),
  })),
}));

describe("AIPhoneServiceRegistry", () => {
  let mockFactory: AIPhoneServiceProviderFactory;
  let mockProvider: AIPhoneServiceProvider;

  beforeEach(() => {
    // Clear all factories before each test
    AIPhoneServiceRegistry.clearProviders();

    // Create mock factory and provider
    mockProvider = {
      setupConfiguration: vi.fn().mockResolvedValue({ llmId: "test-llm", agentId: "test-agent" }),
      deleteConfiguration: vi
        .fn()
        .mockResolvedValue({ success: true, errors: [], deleted: { llm: true, agent: true } }),
      updateModelConfiguration: vi.fn().mockResolvedValue({ llm_id: "test-llm" }),
      getModelDetails: vi.fn().mockResolvedValue({ llm_id: "test-llm" }),
      getAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent" }),
      updateAgent: vi.fn().mockResolvedValue({ agent_id: "test-agent" }),
      createPhoneCall: vi.fn().mockResolvedValue({ call_id: "test-call" }),
      createPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      deletePhoneNumber: vi.fn().mockResolvedValue(undefined),
      getPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      updatePhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      importPhoneNumber: vi.fn().mockResolvedValue({ phone_number: "+1234567890" }),
      generatePhoneNumberCheckoutSession: vi
        .fn()
        .mockResolvedValue({ url: "test-url", message: "test-message" }),
      cancelPhoneNumberSubscription: vi.fn().mockResolvedValue({ success: true, message: "test-message" }),
      updatePhoneNumberWithAgents: vi.fn().mockResolvedValue({ message: "test-message" }),
      listAgents: vi.fn().mockResolvedValue({ totalCount: 1, filtered: [] }),
      getAgentWithDetails: vi.fn().mockResolvedValue({ agent_id: "test-agent" }),
      createOutboundAgent: vi
        .fn()
        .mockResolvedValue({ id: "test-id", providerAgentId: "test-provider-id", message: "test-message" }),
      updateAgentConfiguration: vi.fn().mockResolvedValue({ message: "test-message" }),
      deleteAgent: vi.fn().mockResolvedValue({ message: "test-message" }),
      createTestCall: vi
        .fn()
        .mockResolvedValue({ callId: "test-call-id", status: "test-status", message: "test-message" }),
    };

    mockFactory = {
      create: vi.fn().mockReturnValue(mockProvider),
    };
  });

  describe("initialize", () => {
    it("should initialize with provided configuration", () => {
      AIPhoneServiceRegistry.initialize({
        defaultProvider: "test-provider",
        providers: [
          { type: "test-provider", factory: mockFactory },
          { type: "another-provider", factory: mockFactory },
        ],
      });

      expect(AIPhoneServiceRegistry.isInitialized()).toBe(true);
      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe("test-provider");
      expect(AIPhoneServiceRegistry.getAvailableProviders()).toContain("test-provider");
      expect(AIPhoneServiceRegistry.getAvailableProviders()).toContain("another-provider");
    });

    it("should set first provider as default if defaultProvider not specified", () => {
      AIPhoneServiceRegistry.initialize({
        providers: [
          { type: "first-provider", factory: mockFactory },
          { type: "second-provider", factory: mockFactory },
        ],
      });

      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe("first-provider");
    });

    it("should allow initialization without providers", () => {
      AIPhoneServiceRegistry.initialize();

      expect(AIPhoneServiceRegistry.isInitialized()).toBe(true);
      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe(AIPhoneServiceProviderType.RETELL_AI);
    });
  });

  describe("registerProvider", () => {
    it("should register a provider factory", () => {
      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);

      expect(AIPhoneServiceRegistry.isProviderRegistered("test-provider")).toBe(true);
      expect(AIPhoneServiceRegistry.getAvailableProviders()).toContain("test-provider");
    });

    it("should keep default as retellAI even after registering provider", () => {
      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);

      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe(AIPhoneServiceProviderType.RETELL_AI);
    });

    it("should allow overriding existing provider", () => {
      const newMockFactory: AIPhoneServiceProviderFactory = {
        create: vi.fn().mockReturnValue(mockProvider),
      };

      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);
      AIPhoneServiceRegistry.registerProvider("test-provider", newMockFactory);

      const retrievedFactory = AIPhoneServiceRegistry.getProviderFactory("test-provider");
      expect(retrievedFactory).toBe(newMockFactory);
    });
  });

  describe("getProviderFactory", () => {
    it("should return registered factory", () => {
      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);

      const retrievedFactory = AIPhoneServiceRegistry.getProviderFactory("test-provider");
      expect(retrievedFactory).toBe(mockFactory);
    });

    it("should return undefined for unregistered provider", () => {
      const retrievedFactory = AIPhoneServiceRegistry.getProviderFactory("nonexistent");
      expect(retrievedFactory).toBeUndefined();
    });
  });

  describe("createProvider", () => {
    it("should create provider instance using registered factory", () => {
      const config: AIPhoneServiceProviderConfig = { apiKey: "test-key" };
      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);

      const provider = AIPhoneServiceRegistry.createProvider("test-provider", config);

      expect(mockFactory.create).toHaveBeenCalledWith(config);
      expect(provider).toBe(mockProvider);
    });

    it("should throw error for unregistered provider", () => {
      const config: AIPhoneServiceProviderConfig = { apiKey: "test-key" };

      expect(() => {
        AIPhoneServiceRegistry.createProvider("nonexistent", config);
      }).toThrow("AI phone service provider 'nonexistent' not found. Available providers: ");
    });

    it("should include available providers in error message when factory not found", () => {
      AIPhoneServiceRegistry.registerProvider("provider1", mockFactory);
      AIPhoneServiceRegistry.registerProvider("provider2", mockFactory);

      expect(() => {
        AIPhoneServiceRegistry.createProvider("nonexistent", {});
      }).toThrow("Available providers: provider1, provider2");
    });
  });

  describe("createDefaultProvider", () => {
    it("should create provider using default provider type", () => {
      const config: AIPhoneServiceProviderConfig = { apiKey: "test-key" };
      AIPhoneServiceRegistry.initialize({
        defaultProvider: "test-provider",
        providers: [{ type: "test-provider", factory: mockFactory }],
      });

      const provider = AIPhoneServiceRegistry.createDefaultProvider(config);

      expect(mockFactory.create).toHaveBeenCalledWith(config);
      expect(provider).toBe(mockProvider);
    });

    it("should throw error when default provider is not registered", () => {
      const config: AIPhoneServiceProviderConfig = { apiKey: "test-key" };

      expect(() => {
        AIPhoneServiceRegistry.createDefaultProvider(config);
      }).toThrow("AI phone service provider 'retellAI' not found");
    });
  });

  describe("setDefaultProvider", () => {
    it("should set default provider when provider is registered", () => {
      AIPhoneServiceRegistry.registerProvider("new-default", mockFactory);

      AIPhoneServiceRegistry.setDefaultProvider("new-default");

      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe("new-default");
    });

    it("should throw error when setting unregistered provider as default", () => {
      expect(() => {
        AIPhoneServiceRegistry.setDefaultProvider("nonexistent");
      }).toThrow("Cannot set default provider to 'nonexistent' - provider not registered");
    });
  });

  describe("getDefaultProvider", () => {
    it("should return current default provider", () => {
      AIPhoneServiceRegistry.initialize({
        defaultProvider: "test-provider",
        providers: [{ type: "test-provider", factory: mockFactory }],
      });

      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe("test-provider");
    });

    it("should return retellAI as default provider", () => {
      expect(AIPhoneServiceRegistry.getDefaultProvider()).toBe(AIPhoneServiceProviderType.RETELL_AI);
    });
  });

  describe("getAvailableProviders", () => {
    it("should return empty array when no providers registered", () => {
      expect(AIPhoneServiceRegistry.getAvailableProviders()).toEqual([]);
    });

    it("should return array of registered provider names", () => {
      AIPhoneServiceRegistry.registerProvider("provider1", mockFactory);
      AIPhoneServiceRegistry.registerProvider("provider2", mockFactory);

      const providers = AIPhoneServiceRegistry.getAvailableProviders();
      expect(providers).toContain("provider1");
      expect(providers).toContain("provider2");
      expect(providers).toHaveLength(2);
    });
  });

  describe("isProviderRegistered", () => {
    it("should return true for registered provider", () => {
      AIPhoneServiceRegistry.registerProvider("test-provider", mockFactory);

      expect(AIPhoneServiceRegistry.isProviderRegistered("test-provider")).toBe(true);
    });

    it("should return false for unregistered provider", () => {
      expect(AIPhoneServiceRegistry.isProviderRegistered("nonexistent")).toBe(false);
    });
  });
});

describe("createAIPhoneServiceProvider", () => {
  let mockFactory: AIPhoneServiceProviderFactory;
  let mockProvider: AIPhoneServiceProvider;

  beforeEach(() => {
    // Clear all factories before each test
    AIPhoneServiceRegistry.clearProviders();

    mockProvider = {
      setupConfiguration: vi.fn(),
      deleteConfiguration: vi.fn(),
      updateModelConfiguration: vi.fn(),
      getModelDetails: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      createPhoneCall: vi.fn(),
      createPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      getPhoneNumber: vi.fn(),
      updatePhoneNumber: vi.fn(),
      importPhoneNumber: vi.fn(),
      generatePhoneNumberCheckoutSession: vi.fn(),
      cancelPhoneNumberSubscription: vi.fn(),
      updatePhoneNumberWithAgents: vi.fn(),
      listAgents: vi.fn(),
      getAgentWithDetails: vi.fn(),
      createOutboundAgent: vi.fn(),
      updateAgentConfiguration: vi.fn(),
      deleteAgent: vi.fn(),
      createTestCall: vi.fn(),
    };

    mockFactory = {
      create: vi.fn().mockReturnValue(mockProvider),
    };
  });

  it("should automatically initialize registry when not initialized", () => {
    // Registry starts uninitialized
    expect(AIPhoneServiceRegistry.isInitialized()).toBe(false);

    // Should automatically initialize the registry and create provider
    expect(() => {
      createAIPhoneServiceProvider({
        config: { apiKey: "test-key" },
      });
    }).not.toThrow();

    // Registry should now be initialized
    expect(AIPhoneServiceRegistry.isInitialized()).toBe(true);
  });

  it("should create provider with specified type and config", () => {
    AIPhoneServiceRegistry.initialize({
      providers: [{ type: "custom-provider", factory: mockFactory }],
    });

    // For custom providers, we must provide API key in config since there's no env var mapping
    const provider = createAIPhoneServiceProvider({
      providerType: "custom-provider",
      config: { apiKey: "custom-key", enableLogging: false },
    });

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "custom-key",
      enableLogging: false,
    });
    expect(provider).toBe(mockProvider);
  });

  it("should use default provider when type not specified", () => {
    AIPhoneServiceRegistry.initialize({
      defaultProvider: AIPhoneServiceProviderType.RETELL_AI, // Use RETELL_AI as default since we have its API key
      providers: [{ type: AIPhoneServiceProviderType.RETELL_AI, factory: mockFactory }],
    });

    const provider = createAIPhoneServiceProvider();

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      enableLogging: true, // Should be true when NODE_ENV is not production
    });
    expect(provider).toBe(mockProvider);
  });

  it("should merge provided config with defaults", () => {
    AIPhoneServiceRegistry.initialize({
      providers: [{ type: AIPhoneServiceProviderType.RETELL_AI, factory: mockFactory }],
    });

    createAIPhoneServiceProvider({
      providerType: AIPhoneServiceProviderType.RETELL_AI,
      config: { enableLogging: false },
    });

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      enableLogging: false,
    });
  });

  it("should override default apiKey with provided config", () => {
    AIPhoneServiceRegistry.initialize({
      providers: [{ type: AIPhoneServiceProviderType.RETELL_AI, factory: mockFactory }],
    });

    createAIPhoneServiceProvider({
      providerType: AIPhoneServiceProviderType.RETELL_AI,
      config: { apiKey: "override-key" },
    });

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "override-key",
      enableLogging: true,
    });
  });

  it("should throw error when default provider is not registered", () => {
    AIPhoneServiceRegistry.initialize(); // Initialize without providers

    expect(() => {
      createAIPhoneServiceProvider();
    }).toThrow("AI phone service provider 'retellAI' not found");
  });
});

describe("createDefaultAIPhoneServiceProvider", () => {
  let mockFactory: AIPhoneServiceProviderFactory;
  let mockProvider: AIPhoneServiceProvider;

  beforeEach(() => {
    AIPhoneServiceRegistry.clearProviders();

    mockProvider = {
      setupConfiguration: vi.fn(),
      deleteConfiguration: vi.fn(),
      updateModelConfiguration: vi.fn(),
      getModelDetails: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      createPhoneCall: vi.fn(),
      createPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      getPhoneNumber: vi.fn(),
      updatePhoneNumber: vi.fn(),
      importPhoneNumber: vi.fn(),
      generatePhoneNumberCheckoutSession: vi.fn(),
      cancelPhoneNumberSubscription: vi.fn(),
      updatePhoneNumberWithAgents: vi.fn(),
      listAgents: vi.fn(),
      getAgentWithDetails: vi.fn(),
      createOutboundAgent: vi.fn(),
      updateAgentConfiguration: vi.fn(),
      deleteAgent: vi.fn(),
      createTestCall: vi.fn(),
    };

    mockFactory = {
      create: vi.fn().mockReturnValue(mockProvider),
    };

    AIPhoneServiceRegistry.initialize({
      defaultProvider: AIPhoneServiceProviderType.RETELL_AI,
      providers: [{ type: AIPhoneServiceProviderType.RETELL_AI, factory: mockFactory }],
    });
  });

  it("should create provider using default configuration", () => {
    const provider = createDefaultAIPhoneServiceProvider();

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "test-api-key",
      enableLogging: true,
    });
    expect(provider).toBe(mockProvider);
  });

  it("should merge provided config with defaults", () => {
    const customConfig = { enableLogging: false, apiKey: "custom-key" };
    const provider = createDefaultAIPhoneServiceProvider(customConfig);

    expect(mockFactory.create).toHaveBeenCalledWith({
      apiKey: "custom-key",
      enableLogging: false,
    });
    expect(provider).toBe(mockProvider);
  });

  it("should use default provider type internally", () => {
    // This test ensures createDefaultAIPhoneServiceProvider calls createAIPhoneServiceProvider correctly
    const provider = createDefaultAIPhoneServiceProvider();

    expect(provider).toBe(mockProvider);
    expect(mockFactory.create).toHaveBeenCalledTimes(1);
  });
});
