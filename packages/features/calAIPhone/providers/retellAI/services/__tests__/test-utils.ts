import { vi } from "vitest";

import type { AgentRepositoryInterface } from "../../interfaces/AgentRepositoryInterface";
import type { PhoneNumberRepositoryInterface } from "../../interfaces/PhoneNumberRepositoryInterface";
import type { TransactionInterface } from "../../interfaces/TransactionInterface";
import type { RetellAIRepository, RetellAgent, RetellLLM, RetellPhoneNumber, RetellCall } from "../types";

/**
 * Shared testing utilities and mock factories for service tests
 * Reduces boilerplate and ensures consistent test setup
 */

// Mock Factories for Domain Objects
export const createMockAgent = (overrides: Partial<RetellAgent> = {}): RetellAgent => ({
  agent_id: "agent-123",
  agent_name: "Test Agent",
  voice_id: "voice-123",
  language: "en",
  responsiveness: 1.0,
  interruption_sensitivity: 1.0,
  llm_websocket_url: "wss://example.com",
  ...overrides,
});

export const createMockLLM = (overrides: Partial<RetellLLM> = {}): RetellLLM => ({
  llm_id: "llm-123",
  general_prompt: "You are a helpful assistant",
  general_tools: [],
  states: [],
  starting_state: "default",
  inbound_dynamic_variables_webhook_url: null,
  outbound_dynamic_variables_webhook_url: null,
  ...overrides,
});

export const createMockPhoneNumber = (overrides: Partial<RetellPhoneNumber> = {}): RetellPhoneNumber => ({
  phone_number: "+1234567890",
  phone_number_pretty: "(123) 456-7890",
  inbound_agent_id: null,
  outbound_agent_id: null,
  ...overrides,
});

export const createMockCall = (overrides: Partial<RetellCall> = {}): RetellCall => ({
  call_id: "call-123",
  call_status: "registered",
  agent_id: "agent-123",
  from_number: "+1234567890",
  to_number: "+0987654321",
  direction: "outbound",
  ...overrides,
});

export const createMockDatabaseAgent = (overrides: any = {}) => ({
  id: "db-agent-123",
  name: "Test Agent",
  providerAgentId: "agent-123",
  userId: 1,
  teamId: null,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPhoneNumberRecord = (overrides: any = {}) => ({
  id: 1,
  phoneNumber: "+1234567890",
  userId: 1,
  teamId: null,
  provider: "retell", // Default to retell provider for regular phone numbers
  stripeSubscriptionId: "sub_123",
  subscriptionStatus: "ACTIVE",
  outboundAgentId: null,
  inboundAgentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Helper for creating custom telephony phone number records
export const createMockCustomTelephonyPhoneNumberRecord = (overrides: any = {}) =>
  createMockPhoneNumberRecord({ provider: "custom-telephony", ...overrides });

// Repository Mock Factories
export const createMockRetellRepository = (): RetellAIRepository & {
  [K in keyof RetellAIRepository]: vi.Mock;
} => {
  return {
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
};

export const createMockAgentRepository = (): AgentRepositoryInterface & {
  [K in keyof AgentRepositoryInterface]: vi.Mock;
} => {
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
};

export const createMockPhoneNumberRepository = (): PhoneNumberRepositoryInterface & {
  [K in keyof PhoneNumberRepositoryInterface]: vi.Mock;
} => {
  return {
    createPhoneNumber: vi.fn(),
    findByPhoneNumberAndUserId: vi.fn(),
    findByPhoneNumberAndTeamId: vi.fn(),
    deletePhoneNumber: vi.fn(),
    updateAgents: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
    findByIdAndUserId: vi.fn(),
    findByIdWithTeamAccess: vi.fn(),
  };
};

export const createMockTransactionManager = (): TransactionInterface & {
  [K in keyof TransactionInterface]: vi.Mock;
} => {
  return {
    executeInTransaction: vi.fn().mockImplementation(async (callback) => {
      // Default successful transaction simulation
      const mockContext = {
        phoneNumberRepository: {
          createPhoneNumber: vi.fn().mockResolvedValue({}),
        },
      };
      return await callback(mockContext);
    }),
  };
};

// Common Test Setup Functions
export const setupBasicMocks = () => {
  const mockRetellRepository = createMockRetellRepository();
  const mockAgentRepository = createMockAgentRepository();
  const mockPhoneNumberRepository = createMockPhoneNumberRepository();
  const mockTransactionManager = createMockTransactionManager();

  return {
    mockRetellRepository,
    mockAgentRepository,
    mockPhoneNumberRepository,
    mockTransactionManager,
  };
};

// Credit Service Mocks
export const setupCreditMocks = () => {
  const mockCreditService = {
    getAllCredits: vi.fn().mockResolvedValue({
      totalRemainingMonthlyCredits: 100,
      additionalCredits: 50,
    }),
  };

  vi.mock("@calcom/features/ee/billing/credit-service", () => ({
    CreditService: vi.fn().mockImplementation(() => mockCreditService),
  }));

  return mockCreditService;
};

// Rate Limiting Mocks
export const setupRateLimitMocks = () => {
  vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
    checkRateLimitAndThrowError: vi.fn().mockResolvedValue(undefined),
  }));
};

// Test Error Classes
export class TestError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "TestError";
  }
}

export class TestRetellAPIError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = "TestRetellAPIError";
  }
}
