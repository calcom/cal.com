import { describe, it, expect, beforeEach, vi } from "vitest";

import logger from "@calcom/lib/logger";

import type { AIPhoneServiceProviderConfig } from "../../interfaces/AIPhoneService.interface";
import { RetellAIPhoneServiceProvider } from "./RetellAIPhoneServiceProvider";
import { RetellAIPhoneServiceProviderFactory } from "./RetellAIPhoneServiceProviderFactory";
import { RetellSDKClient } from "./RetellSDKClient";

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

vi.mock("./RetellSDKClient", () => ({
  RetellSDKClient: vi.fn().mockImplementation(function (logger) {
    return {
      logger,
      createLLM: vi.fn(),
      getLLM: vi.fn(),
      updateLLM: vi.fn(),
      deleteLLM: vi.fn(),
      createOutboundAgent: vi.fn(),
      getAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      createPhoneNumber: vi.fn(),
      importPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      getPhoneNumber: vi.fn(),
      updatePhoneNumber: vi.fn(),
      createPhoneCall: vi.fn(),
    };
  }),
}));

vi.mock("./RetellAIPhoneServiceProvider", () => ({
  RetellAIPhoneServiceProvider: vi
    .fn()
    .mockImplementation(function (repository, agentRepository, phoneNumberRepository, transactionManager) {
      return {
        repository,
        agentRepository,
        phoneNumberRepository,
        transactionManager,
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
      };
    }),
}));

vi.mock("../adapters/PrismaAgentRepositoryAdapter", () => ({
  PrismaAgentRepositoryAdapter: vi.fn().mockImplementation(function () {
    return {
      canManageTeamResources: vi.fn(),
      findByIdWithUserAccess: vi.fn(),
      findByProviderAgentIdWithUserAccess: vi.fn(),
      findManyWithUserAccess: vi.fn(),
      findByIdWithUserAccessAndDetails: vi.fn(),
      create: vi.fn(),
      findByIdWithAdminAccess: vi.fn(),
      findByIdWithCallAccess: vi.fn(),
      delete: vi.fn(),
      linkOutboundAgentToWorkflow: vi.fn(),
    };
  }),
}));

vi.mock("../adapters/PrismaPhoneNumberRepositoryAdapter", () => ({
  PrismaPhoneNumberRepositoryAdapter: vi.fn().mockImplementation(function () {
    return {
      findByPhoneNumberAndUserId: vi.fn(),
      findByPhoneNumberAndTeamId: vi.fn(),
      findByIdAndUserId: vi.fn(),
      findByIdWithTeamAccess: vi.fn(),
      createPhoneNumber: vi.fn(),
      deletePhoneNumber: vi.fn(),
      updateSubscriptionStatus: vi.fn(),
      updateAgents: vi.fn(),
    };
  }),
}));

vi.mock("../adapters/PrismaTransactionAdapter", () => ({
  PrismaTransactionAdapter: vi.fn().mockImplementation(function () {
    return {
      executeInTransaction: vi.fn(),
    };
  }),
}));

describe("RetellAIPhoneServiceProviderFactory", () => {
  let factory: RetellAIPhoneServiceProviderFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new RetellAIPhoneServiceProviderFactory();
  });

  describe("create", () => {
    it("should create provider with logger when logging enabled", () => {
      const config: AIPhoneServiceProviderConfig = {
        enableLogging: true,
      };

      const provider = factory.create(config);

      expect(logger.getSubLogger).toHaveBeenCalledWith({ prefix: ["RetellAIPhoneServiceProvider:"] });
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

      const provider = RetellAIPhoneServiceProviderFactory.createWithConfig({
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
      expect(RetellAIPhoneServiceProvider).toHaveBeenCalledWith(
        clientInstance,
        expect.any(Object), // PrismaAgentRepositoryAdapter
        expect.any(Object), // PrismaPhoneNumberRepositoryAdapter
        expect.any(Object) // PrismaTransactionAdapter
      );
    });
  });
});
