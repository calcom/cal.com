import { describe, it, expect, beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";

import type { AIPhoneServiceProviderConfig } from "../../interfaces/ai-phone-service.interface";
import { RetellSDKClient } from "./client";
import { RetellAIProviderFactory } from "./factory";
import { RetellAIProvider } from "./provider";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("./client", () => ({
  RetellSDKClient: vi.fn().mockImplementation((logger) => ({
    logger,
    createLLM: vi.fn(),
    getLLM: vi.fn(),
    updateLLM: vi.fn(),
    deleteLLM: vi.fn(),
    createAgent: vi.fn(),
    getAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    createPhoneNumber: vi.fn(),
    importPhoneNumber: vi.fn(),
    deletePhoneNumber: vi.fn(),
    getPhoneNumber: vi.fn(),
    updatePhoneNumber: vi.fn(),
    createPhoneCall: vi.fn(),
  })),
}));

vi.mock("./provider", () => ({
  RetellAIProvider: vi.fn().mockImplementation((repository) => ({
    repository,
    setupConfiguration: vi.fn(),
    deleteConfiguration: vi.fn(),
    updateLLMConfiguration: vi.fn(),
    getLLMDetails: vi.fn(),
    getAgent: vi.fn(),
    updateAgent: vi.fn(),
    createPhoneCall: vi.fn(),
    createPhoneNumber: vi.fn(),
    deletePhoneNumber: vi.fn(),
    getPhoneNumber: vi.fn(),
    updatePhoneNumber: vi.fn(),
    importPhoneNumber: vi.fn(),
  })),
}));

describe("RetellAIProviderFactory", () => {
  let factory: RetellAIProviderFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new RetellAIProviderFactory();
  });

  describe("create", () => {
    it("should create provider with logger when logging enabled", () => {
      const config: AIPhoneServiceProviderConfig = {
        enableLogging: true,
      };

      const provider = factory.create(config);

      expect(logger.getSubLogger).toHaveBeenCalledWith({ prefix: ["retellAIProvider:"] });
      const mockLoggerInstance = (logger.getSubLogger as any).mock.results[0].value;
      expect(RetellSDKClient).toHaveBeenCalledWith(mockLoggerInstance);
      expect(provider).toBeDefined();
    });

    it("should create provider without logger when logging disabled", () => {
      const config: AIPhoneServiceProviderConfig = {
        enableLogging: false,
      };

      const provider = factory.create(config);

      expect(logger.getSubLogger).not.toHaveBeenCalled();
      expect(RetellSDKClient).toHaveBeenCalledWith(undefined);
      expect(provider).toBeDefined();
    });
  });

  describe("createWithConfig static method", () => {
    it("should use custom logger when provided", () => {
      const customLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      } as unknown as ReturnType<typeof logger.getSubLogger>;

      const provider = RetellAIProviderFactory.createWithConfig({
        enableLogging: true,
        logger: customLogger,
      });

      expect(logger.getSubLogger).not.toHaveBeenCalled();
      expect(RetellSDKClient).toHaveBeenCalledWith(customLogger);
      expect(provider).toBeDefined();
    });
  });

  describe("dependency injection", () => {
    it("should inject SDK client into provider", () => {
      factory.create({});

      const clientInstance = (RetellSDKClient as any).mock.results[0].value;
      expect(RetellAIProvider).toHaveBeenCalledWith(clientInstance);
    });
  });
});
