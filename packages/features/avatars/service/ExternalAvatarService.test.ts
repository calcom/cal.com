import process from "node:process";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvatarApiClient } from "../AvatarApiClient";
import { ExternalAvatarService } from "./ExternalAvatarService";

function createMockRepository() {
  return {
    findByEmail: vi.fn(),
    upsert: vi.fn(),
  };
}

describe("ExternalAvatarService", () => {
  let mockRepo: ReturnType<typeof createMockRepository>;
  let service: ExternalAvatarService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, AVATARAPI_USERNAME: "test-user", AVATARAPI_PASSWORD: "test-pass" };
    mockRepo = createMockRepository();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ExternalAvatarService({ externalAvatarRepository: mockRepo as any });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns cached imageUrl when DB has an entry with a URL", async () => {
    mockRepo.findByEmail.mockResolvedValueOnce({
      email: "user@example.com",
      imageUrl: "https://example.com/avatar.png",
    });

    const result = await service.getImageUrl("user@example.com");

    expect(result).toBe("https://example.com/avatar.png");
    expect(mockRepo.findByEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it("returns null when DB has an entry with null imageUrl (previously checked, not found)", async () => {
    mockRepo.findByEmail.mockResolvedValueOnce({
      email: "no-avatar@example.com",
      imageUrl: null,
    });

    const result = await service.getImageUrl("no-avatar@example.com");

    expect(result).toBeNull();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it("calls API and persists result when DB has no entry", async () => {
    mockRepo.findByEmail.mockResolvedValueOnce(null);
    mockRepo.upsert.mockResolvedValueOnce({
      email: "new@example.com",
      imageUrl: "https://example.com/new-avatar.png",
    });

    const mockImageUrl = "https://example.com/new-avatar.png";
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve({ Success: true, Image: mockImageUrl }),
    } as Response);

    const result = await service.getImageUrl("new@example.com");

    expect(result).toBe(mockImageUrl);
    expect(mockRepo.upsert).toHaveBeenCalledWith("new@example.com", mockImageUrl);
  });

  it("calls API and persists null when avatar not found", async () => {
    mockRepo.findByEmail.mockResolvedValueOnce(null);
    mockRepo.upsert.mockResolvedValueOnce({
      email: "no-avatar@example.com",
      imageUrl: null,
    });

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      json: () => Promise.resolve({ Success: false, Error: "Not found" }),
    } as Response);

    const result = await service.getImageUrl("no-avatar@example.com");

    expect(result).toBeNull();
    expect(mockRepo.upsert).toHaveBeenCalledWith("no-avatar@example.com", null);
  });

  it("returns null without calling API when credentials are missing", async () => {
    delete process.env.AVATARAPI_USERNAME;
    delete process.env.AVATARAPI_PASSWORD;

    mockRepo.findByEmail.mockResolvedValueOnce(null);

    vi.spyOn(AvatarApiClient, "fromEnv").mockReturnValueOnce(null);

    const result = await service.getImageUrl("user@example.com");

    expect(result).toBeNull();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it("calls API when fromEnv returns a client", async () => {
    mockRepo.findByEmail.mockResolvedValueOnce(null);
    mockRepo.upsert.mockResolvedValueOnce({
      email: "test@example.com",
      imageUrl: "https://example.com/img.png",
    });

    const mockClient = new AvatarApiClient({ username: "u", password: "p" });
    vi.spyOn(AvatarApiClient, "fromEnv").mockReturnValueOnce(mockClient);
    vi.spyOn(mockClient, "getImageUrl").mockResolvedValueOnce("https://example.com/img.png");

    const result = await service.getImageUrl("test@example.com");

    expect(result).toBe("https://example.com/img.png");
    expect(mockClient.getImageUrl).toHaveBeenCalledWith("test@example.com");
    expect(mockRepo.upsert).toHaveBeenCalledWith("test@example.com", "https://example.com/img.png");
  });
});
