import { describe, expect, it, vi, beforeEach } from "vitest";

import { getBannerUrl } from "./update.handler";

vi.mock("@calcom/lib/server/avatar", () => ({
  uploadLogo: vi.fn(),
}));

vi.mock("@calcom/lib/server/resizeBase64Image", () => ({
  resizeBase64Image: vi.fn((input) => input),
}));

const { uploadLogo } = await import("@calcom/lib/server/avatar");
const { resizeBase64Image } = await import("@calcom/lib/server/resizeBase64Image");

describe("getBannerUrl", () => {
  const mockTeamId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined when banner is undefined (not provided)", async () => {
    const result = await getBannerUrl(undefined, mockTeamId);

    expect(result).toBeUndefined();
    expect(uploadLogo).not.toHaveBeenCalled();
    expect(resizeBase64Image).not.toHaveBeenCalled();
  });

  it("should return null when banner is explicitly set to null", async () => {
    const result = await getBannerUrl(null, mockTeamId);

    expect(result).toBe(null);
    expect(uploadLogo).not.toHaveBeenCalled();
    expect(resizeBase64Image).not.toHaveBeenCalled();
  });

  it("should upload and return URL for valid PNG base64 banner", async () => {
    const mockBannerUrl = "https://example.com/banner.png";
    const validBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    vi.mocked(uploadLogo).mockResolvedValue(mockBannerUrl);

    const result = await getBannerUrl(validBase64, mockTeamId);

    expect(result).toBe(mockBannerUrl);
    expect(resizeBase64Image).toHaveBeenCalledWith(validBase64, { maxSize: 1500 });
    expect(uploadLogo).toHaveBeenCalledWith({
      logo: validBase64, // resizeBase64Image mock returns input unchanged
      teamId: mockTeamId,
      isBanner: true,
    });
  });

  it("should upload and return URL for valid JPEG base64 banner", async () => {
    const mockBannerUrl = "https://example.com/banner.jpg";
    const validBase64 =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==";

    vi.mocked(uploadLogo).mockResolvedValue(mockBannerUrl);

    const result = await getBannerUrl(validBase64, mockTeamId);

    expect(result).toBe(mockBannerUrl);
    expect(resizeBase64Image).toHaveBeenCalledWith(validBase64, { maxSize: 1500 });
    expect(uploadLogo).toHaveBeenCalledWith({
      logo: validBase64,
      teamId: mockTeamId,
      isBanner: true,
    });
  });

  it("should upload and return URL for valid JPG base64 banner", async () => {
    const mockBannerUrl = "https://example.com/banner.jpg";
    const validBase64 =
      "data:image/jpg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==";

    vi.mocked(uploadLogo).mockResolvedValue(mockBannerUrl);

    const result = await getBannerUrl(validBase64, mockTeamId);

    expect(result).toBe(mockBannerUrl);
    expect(resizeBase64Image).toHaveBeenCalledWith(validBase64, { maxSize: 1500 });
    expect(uploadLogo).toHaveBeenCalledWith({
      logo: validBase64,
      teamId: mockTeamId,
      isBanner: true,
    });
  });

  it("should return undefined for invalid banner string", async () => {
    const result = await getBannerUrl("invalid-banner-string", mockTeamId);

    expect(result).toBeUndefined();
    expect(uploadLogo).not.toHaveBeenCalled();
    expect(resizeBase64Image).not.toHaveBeenCalled();
  });

  it("should return undefined for empty banner string", async () => {
    const result = await getBannerUrl("", mockTeamId);

    expect(result).toBeUndefined();
    expect(uploadLogo).not.toHaveBeenCalled();
    expect(resizeBase64Image).not.toHaveBeenCalled();
  });

  it("should return undefined for non-image base64 string", async () => {
    const invalidBase64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";

    const result = await getBannerUrl(invalidBase64, mockTeamId);

    expect(result).toBeUndefined();
    expect(uploadLogo).not.toHaveBeenCalled();
    expect(resizeBase64Image).not.toHaveBeenCalled();
  });
});
