import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/checkRateLimitAndThrowError", () => ({
  checkRateLimitAndThrowError: vi.fn(),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: vi.fn((input: string) => input),
}));

vi.mock("@calcom/lib/server/imageUtils", () => ({
  convertSvgToPng: vi.fn((input: string) => input),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-1234"),
}));

const { checkRateLimitAndThrowError } = await import("@calcom/lib/checkRateLimitAndThrowError");
const { resizeBase64Image } = await import("@calcom/lib/server/resizeBase64Image");
const { convertSvgToPng } = await import("@calcom/lib/server/imageUtils");

import type { TrpcSessionUser } from "../../../types";
import { uploadOnboardingImageHandler } from "./uploadOnboardingImage.handler";

const createMockUser = (
  overrides: Partial<NonNullable<TrpcSessionUser>> = {}
): NonNullable<TrpcSessionUser> =>
  ({
    id: 1,
    email: "test@example.com",
    username: "testuser",
    name: "Test User",
    ...overrides,
  }) as NonNullable<TrpcSessionUser>;

describe("uploadOnboardingImageHandler", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await prismock.reset();
  });

  it("should upload a logo image and return the avatar URL", async () => {
    const mockUser = createMockUser();
    const imageData =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    const result = await uploadOnboardingImageHandler({
      input: { imageData, type: "logo" },
      ctx: { user: mockUser },
    });

    expect(result).toEqual({ url: "/api/avatar/mock-uuid-1234.png" });

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
      rateLimitingType: "core",
      identifier: `uploadOnboardingImage:${mockUser.id}`,
    });

    // Logo should NOT pass maxSize option
    expect(resizeBase64Image).toHaveBeenCalledWith(imageData, undefined);
    expect(convertSvgToPng).toHaveBeenCalledWith(imageData);

    // Verify avatar was created in DB
    const avatar = await prismock.avatar.findFirst({
      where: { userId: mockUser.id, isBanner: false },
    });
    expect(avatar).toBeDefined();
    expect(avatar?.objectKey).toBe("mock-uuid-1234");
    expect(avatar?.isBanner).toBe(false);
    expect(avatar?.data).toBe(imageData);
  });

  it("should upload a banner image with maxSize resize and return the avatar URL", async () => {
    const mockUser = createMockUser();
    const imageData =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    const result = await uploadOnboardingImageHandler({
      input: { imageData, type: "banner" },
      ctx: { user: mockUser },
    });

    expect(result).toEqual({ url: "/api/avatar/mock-uuid-1234.png" });

    // Banner should pass maxSize: 1500
    expect(resizeBase64Image).toHaveBeenCalledWith(imageData, { maxSize: 1500 });
    expect(convertSvgToPng).toHaveBeenCalledWith(imageData);

    // Verify avatar was created with isBanner: true
    const avatar = await prismock.avatar.findFirst({
      where: { userId: mockUser.id, isBanner: true },
    });
    expect(avatar).toBeDefined();
    expect(avatar?.objectKey).toBe("mock-uuid-1234");
    expect(avatar?.isBanner).toBe(true);
  });

  it("should upsert (update) an existing avatar on re-upload", async () => {
    const mockUser = createMockUser();
    const imageData = "data:image/png;base64,abc123";

    // Create an existing avatar entry
    await prismock.avatar.create({
      data: {
        userId: mockUser.id,
        teamId: 0,
        data: "old-data",
        objectKey: "old-uuid",
        isBanner: false,
      },
    });

    const result = await uploadOnboardingImageHandler({
      input: { imageData, type: "logo" },
      ctx: { user: mockUser },
    });

    expect(result).toEqual({ url: "/api/avatar/mock-uuid-1234.png" });

    // Verify the avatar was updated, not duplicated
    const avatars = await prismock.avatar.findMany({
      where: { userId: mockUser.id, isBanner: false },
    });
    expect(avatars).toHaveLength(1);
    expect(avatars[0].objectKey).toBe("mock-uuid-1234");
    expect(avatars[0].data).toBe(imageData);
  });

  it("should call rate limiter with the correct user identifier", async () => {
    const mockUser = createMockUser({ id: 42 });
    const imageData = "data:image/png;base64,abc";

    await uploadOnboardingImageHandler({
      input: { imageData, type: "logo" },
      ctx: { user: mockUser },
    });

    expect(checkRateLimitAndThrowError).toHaveBeenCalledWith({
      rateLimitingType: "core",
      identifier: "uploadOnboardingImage:42",
    });
  });

  it("should propagate rate limit errors", async () => {
    const mockUser = createMockUser();
    const imageData = "data:image/png;base64,abc";

    vi.mocked(checkRateLimitAndThrowError).mockRejectedValueOnce(new Error("Rate limit exceeded"));

    await expect(
      uploadOnboardingImageHandler({
        input: { imageData, type: "logo" },
        ctx: { user: mockUser },
      })
    ).rejects.toThrow("Rate limit exceeded");

    // Ensure no avatar was created when rate limited
    const avatars = await prismock.avatar.findMany({
      where: { userId: mockUser.id },
    });
    expect(avatars).toHaveLength(0);
  });

  it("should handle logo and banner separately for the same user", async () => {
    const mockUser = createMockUser();

    // Upload logo
    await uploadOnboardingImageHandler({
      input: { imageData: "logo-data", type: "logo" },
      ctx: { user: mockUser },
    });

    // Upload banner
    await uploadOnboardingImageHandler({
      input: { imageData: "banner-data", type: "banner" },
      ctx: { user: mockUser },
    });

    const logoAvatar = await prismock.avatar.findFirst({
      where: { userId: mockUser.id, isBanner: false },
    });
    const bannerAvatar = await prismock.avatar.findFirst({
      where: { userId: mockUser.id, isBanner: true },
    });

    expect(logoAvatar).toBeDefined();
    expect(bannerAvatar).toBeDefined();
    expect(logoAvatar?.data).toBe("logo-data");
    expect(bannerAvatar?.data).toBe("banner-data");
  });
});
