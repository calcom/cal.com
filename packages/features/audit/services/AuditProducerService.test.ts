import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IAuditActorRepository } from "@calcom/features/booking-audit/lib/repository/IAuditActorRepository";

import type { IAuditEventRepository } from "../repositories/IAuditEventRepository";
import type { AuditEmitInput } from "./AuditProducerService";
import { AuditProducerService } from "./AuditProducerService";

const mockRepository: Record<keyof IAuditEventRepository, ReturnType<typeof vi.fn>> = {
  create: vi.fn().mockResolvedValue({}),
  createMany: vi.fn(),
  findByOrgId: vi.fn(),
  findByActorId: vi.fn(),
  findByTargetTypeAndId: vi.fn(),
};

const mockActorRepository: Record<keyof IAuditActorRepository, ReturnType<typeof vi.fn>> = {
  findByUserUuid: vi.fn(),
  createIfNotExistsUserActor: vi.fn().mockResolvedValue({ id: "resolved-actor-id" }),
  createIfNotExistsAttendeeActor: vi.fn(),
  createIfNotExistsGuestActor: vi.fn(),
  createIfNotExistsAppActor: vi.fn(),
};

const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function buildInput(overrides?: Partial<AuditEmitInput>): AuditEmitInput {
  return {
    actor: { userUuid: "d570cbe7-11ce-4bce-839e-8c94d3f438b4" },
    action: "ROLE_CHANGED",
    source: "WEBAPP",
    orgId: 1,
    targetType: "membership",
    targetId: "mem-456",
    previousValue: "MEMBER",
    newValue: "ADMIN",
    ...overrides,
  };
}

describe("AuditProducerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function createProducer(hmacSecret?: string) {
    vi.stubEnv("AUDIT_HMAC_SECRET", hmacSecret ?? "");
    return new AuditProducerService({
      auditEventRepository: mockRepository,
      auditActorRepository: mockActorRepository,
      log: mockLogger,
    });
  }

  it("persists event even when orgId is null", async () => {
    const producer = createProducer();

    await producer.emit(buildInput({ orgId: null }));

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: null })
    );
  });

  it("maps action to correct category", async () => {
    const producer = createProducer();

    await producer.emit(buildInput({ action: "ROLE_CHANGED" }));

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: "ACCESS" })
    );
  });

  it("hashes IP with HMAC-SHA-256 when secret is set", async () => {
    const producer = createProducer("test-secret");
    const expectedHash = createHmac("sha256", "test-secret").update("192.168.1.1").digest("hex");

    await producer.emit(buildInput({ ip: "192.168.1.1" }));

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ipHash: expectedHash })
    );
  });

  it("returns null ipHash when secret is not set", async () => {
    const producer = createProducer();

    await producer.emit(buildInput({ ip: "192.168.1.1" }));

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ ipHash: null })
    );
  });

  describe("error resilience", () => {
    it("swallows errors and logs them", async () => {
      const producer = createProducer();
      mockRepository.create.mockRejectedValueOnce(new Error("db error"));

      await expect(producer.emit(buildInput())).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("swallows actor resolution errors and logs them", async () => {
      const producer = createProducer();
      mockActorRepository.createIfNotExistsUserActor.mockRejectedValueOnce(new Error("actor failed"));

      await expect(producer.emit(buildInput())).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
