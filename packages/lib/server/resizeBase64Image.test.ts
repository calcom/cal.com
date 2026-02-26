import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRead = vi.fn();

vi.mock("jimp", () => ({
  default: {
    AUTO: -1,
    read: (...args: unknown[]) => mockRead(...args),
  },
}));

import { isBase64Image, resizeBase64Image } from "./resizeBase64Image";

describe("isBase64Image", () => {
  it("returns true for PNG base64 data URI", () => {
    expect(isBase64Image("data:image/png;base64,abc123")).toBe(true);
  });

  it("returns true for JPEG base64 data URI", () => {
    expect(isBase64Image("data:image/jpeg;base64,abc123")).toBe(true);
  });

  it("returns true for JPG base64 data URI", () => {
    expect(isBase64Image("data:image/jpg;base64,abc123")).toBe(true);
  });

  it("returns false for non-image data URI", () => {
    expect(isBase64Image("data:text/plain;base64,abc123")).toBe(false);
  });

  it("returns false for regular URL", () => {
    expect(isBase64Image("https://example.com/image.png")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isBase64Image("")).toBe(false);
  });
});

describe("resizeBase64Image", () => {
  const mockResize = vi.fn();
  const mockGetBufferAsync = vi.fn();
  let mockWidth = 200;
  let mockHeight = 200;

  beforeEach(() => {
    mockWidth = 200;
    mockHeight = 200;
    mockResize.mockClear();
    mockGetBufferAsync.mockResolvedValue(Buffer.from("resized"));
    mockRead.mockResolvedValue({
      getWidth: () => mockWidth,
      getHeight: () => mockHeight,
      resize: mockResize,
      getBufferAsync: mockGetBufferAsync,
    });
  });

  it("returns URL as-is if not a data URI", async () => {
    const url = "https://example.com/image.png";
    const result = await resizeBase64Image(url);
    expect(result).toBe(url);
  });

  it("throws when mimetype cannot be determined", async () => {
    await expect(resizeBase64Image("data:;base64,abc")).rejects.toThrow("Could not distinguish mimetype");
  });

  it("does not resize when image is within maxSize", async () => {
    mockWidth = 100;
    mockHeight = 100;
    await resizeBase64Image("data:image/png;base64,abc123");
    expect(mockResize).not.toHaveBeenCalled();
  });

  it("resizes when image exceeds default maxSize (384)", async () => {
    mockWidth = 500;
    mockHeight = 500;
    await resizeBase64Image("data:image/png;base64,abc123");
    expect(mockResize).toHaveBeenCalledWith(-1, 384);
  });

  it("uses custom maxSize when provided", async () => {
    mockWidth = 300;
    mockHeight = 300;
    await resizeBase64Image("data:image/png;base64,abc123", { maxSize: 200 });
    expect(mockResize).toHaveBeenCalledWith(-1, 200);
  });

  it("returns base64 data URI with correct mimetype", async () => {
    mockWidth = 100;
    mockHeight = 100;
    const result = await resizeBase64Image("data:image/png;base64,abc123");
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
