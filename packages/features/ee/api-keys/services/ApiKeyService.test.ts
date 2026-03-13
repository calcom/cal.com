import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaApiKeyRepository } from "../repositories/PrismaApiKeyRepository";
import { ApiKeyService } from "./ApiKeyService";

const makeRepo = (overrides: Partial<PrismaApiKeyRepository> = {}) =>
  ({
    findByHashedKey: vi.fn(),
    updateLastUsedAt: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as PrismaApiKeyRepository;

const validKey = {
  id: "key-id-1",
  hashedKey: "hashed",
  userId: 42,
  expiresAt: null,
  user: { uuid: "uuid-1", role: "USER", locked: false, email: "user@example.com" },
};

describe("ApiKeyService.verifyKeyByHashedKey", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid and stamps lastUsedAt on success", async () => {
    const repo = makeRepo({ findByHashedKey: vi.fn().mockResolvedValue(validKey) });
    const service = new ApiKeyService({ apiKeyRepo: repo });

    const result = await service.verifyKeyByHashedKey("hashed");

    expect(result).toEqual({
      valid: true,
      userId: 42,
      user: validKey.user,
    });

    // Allow fire-and-forget to settle
    await vi.waitFor(() => expect(repo.updateLastUsedAt).toHaveBeenCalledWith("key-id-1"));
  });

  it("does not stamp lastUsedAt when key is not found", async () => {
    const repo = makeRepo({ findByHashedKey: vi.fn().mockResolvedValue(null) });
    const service = new ApiKeyService({ apiKeyRepo: repo });

    const result = await service.verifyKeyByHashedKey("unknown");

    expect(result).toEqual({ valid: false, error: "Your API key is not valid." });
    expect(repo.updateLastUsedAt).not.toHaveBeenCalled();
  });

  it("does not stamp lastUsedAt when key is expired", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const repo = makeRepo({
      findByHashedKey: vi.fn().mockResolvedValue({ ...validKey, expiresAt: yesterday }),
    });
    const service = new ApiKeyService({ apiKeyRepo: repo });

    const result = await service.verifyKeyByHashedKey("hashed");

    expect(result).toEqual({ valid: false, error: "This API key is expired." });
    expect(repo.updateLastUsedAt).not.toHaveBeenCalled();
  });

  it("does not stamp lastUsedAt when key has no associated user", async () => {
    const repo = makeRepo({
      findByHashedKey: vi.fn().mockResolvedValue({ ...validKey, userId: null, user: null }),
    });
    const service = new ApiKeyService({ apiKeyRepo: repo });

    const result = await service.verifyKeyByHashedKey("hashed");

    expect(result).toEqual({ valid: false, error: "No user found for this API key." });
    expect(repo.updateLastUsedAt).not.toHaveBeenCalled();
  });

  it("does not throw if updateLastUsedAt fails", async () => {
    const repo = makeRepo({
      findByHashedKey: vi.fn().mockResolvedValue(validKey),
      updateLastUsedAt: vi.fn().mockRejectedValue(new Error("DB error")),
    });
    const service = new ApiKeyService({ apiKeyRepo: repo });

    // Should resolve successfully despite the background update failing
    await expect(service.verifyKeyByHashedKey("hashed")).resolves.toMatchObject({ valid: true });
  });
});
