import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToBuffer = vi.fn();
const mockMetadata = vi.fn();
const mockPng = vi.fn();
const mockJpeg = vi.fn();
const mockWebp = vi.fn();
const mockAvif = vi.fn();
const mockResize = vi.fn();
const mockRotate = vi.fn();

function makeTransformer() {
  const t = {
    png: mockPng,
    jpeg: mockJpeg,
    webp: mockWebp,
    avif: mockAvif,
    resize: mockResize,
    rotate: mockRotate,
    toBuffer: mockToBuffer,
    metadata: mockMetadata,
  };
  // Each method returns the transformer itself for chaining
  mockPng.mockReturnValue(t);
  mockJpeg.mockReturnValue(t);
  mockWebp.mockReturnValue(t);
  mockAvif.mockReturnValue(t);
  mockResize.mockReturnValue(t);
  mockRotate.mockReturnValue(t);
  return t;
}

const mockSharp = vi.fn();

vi.mock("sharp", () => ({
  default: (...args: unknown[]) => mockSharp(...args),
}));

import { convertSvgToPng, detectContentType, resizeImage } from "./imageUtils";

describe("convertSvgToPng", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const t = makeTransformer();
    mockSharp.mockReturnValue(t);
    mockToBuffer.mockResolvedValue(Buffer.from("pngdata"));
  });

  it("converts SVG base64 to PNG base64", async () => {
    const svgBase64 = "data:image/svg+xml;base64," + Buffer.from("<svg></svg>").toString("base64");
    const result = await convertSvgToPng(svgBase64);
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(mockSharp).toHaveBeenCalled();
  });

  it("returns original data when not an SVG data URI", async () => {
    const pngData = "data:image/png;base64,abc123";
    const result = await convertSvgToPng(pngData);
    expect(result).toBe(pngData);
    expect(mockSharp).not.toHaveBeenCalled();
  });

  it("returns placeholder PNG on conversion error", async () => {
    mockToBuffer.mockRejectedValueOnce(new Error("fail"));
    const svgBase64 = "data:image/svg+xml;base64," + Buffer.from("<svg></svg>").toString("base64");
    const result = await convertSvgToPng(svgBase64);
    expect(result).toContain("iVBORw0KGgo");
  });

  it("returns placeholder PNG when SVG exceeds 5MB size limit", async () => {
    const largeSvg = "<svg>" + "x".repeat(6 * 1024 * 1024) + "</svg>";
    const svgBase64 = "data:image/svg+xml;base64," + Buffer.from(largeSvg).toString("base64");
    const result = await convertSvgToPng(svgBase64);
    expect(result).toContain("iVBORw0KGgo");
  });
});

describe("detectContentType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const t = makeTransformer();
    mockSharp.mockReturnValue(t);
  });

  it("detects JPEG from magic bytes", async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const result = await detectContentType(buffer);
    expect(result).toBe("image/jpeg");
  });

  it("detects PNG from magic bytes", async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await detectContentType(buffer);
    expect(result).toBe("image/png");
  });

  it("detects GIF from magic bytes", async () => {
    const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const result = await detectContentType(buffer);
    expect(result).toBe("image/gif");
  });

  it("detects WEBP from magic bytes", async () => {
    const buffer = Buffer.alloc(12);
    buffer[0] = 0x52; // R
    buffer[1] = 0x49; // I
    buffer[2] = 0x46; // F
    buffer[3] = 0x46; // F
    buffer[8] = 0x57; // W
    buffer[9] = 0x45; // E
    buffer[10] = 0x42; // B
    buffer[11] = 0x50; // P
    const result = await detectContentType(buffer);
    expect(result).toBe("image/webp");
  });

  it("detects SVG from <?xml magic bytes", async () => {
    const buffer = Buffer.from("<?xml version");
    const result = await detectContentType(buffer);
    expect(result).toBe("image/svg+xml");
  });

  it("detects SVG from <svg magic bytes", async () => {
    const buffer = Buffer.from("<svg xmlns");
    const result = await detectContentType(buffer);
    expect(result).toBe("image/svg+xml");
  });

  it("detects AVIF from ftyp magic bytes", async () => {
    const buffer = Buffer.alloc(12);
    buffer[4] = 0x66; // f
    buffer[5] = 0x74; // t
    buffer[6] = 0x79; // y
    buffer[7] = 0x70; // p
    buffer[8] = 0x61; // a
    buffer[9] = 0x76; // v
    buffer[10] = 0x69; // i
    buffer[11] = 0x66; // f
    const result = await detectContentType(buffer);
    expect(result).toBe("image/avif");
  });

  it("falls back to sharp metadata for unknown magic bytes", async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    mockMetadata.mockResolvedValueOnce({ format: "webp" });
    const result = await detectContentType(buffer);
    expect(result).toBe("image/webp");
  });

  it("returns null when sharp metadata also fails", async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    mockMetadata.mockRejectedValueOnce(new Error("unknown format"));
    const result = await detectContentType(buffer);
    expect(result).toBeNull();
  });

  it("returns null for sharp metadata with unknown format", async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    mockMetadata.mockResolvedValueOnce({ format: "tiff" });
    const result = await detectContentType(buffer);
    expect(result).toBeNull();
  });

  it("handles sharp metadata returning png format", async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    mockMetadata.mockResolvedValueOnce({ format: "png" });
    const result = await detectContentType(buffer);
    expect(result).toBe("image/png");
  });

  it("handles sharp metadata returning jpeg format", async () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    mockMetadata.mockResolvedValueOnce({ format: "jpeg" });
    const result = await detectContentType(buffer);
    expect(result).toBe("image/jpeg");
  });
});

describe("resizeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const t = makeTransformer();
    mockSharp.mockReturnValue(t);
    mockToBuffer.mockResolvedValue(Buffer.from("resized"));
  });

  it("resizes with width and height", async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = await resizeImage({ buffer, width: 200, height: 100, contentType: "image/png" });
    expect(mockRotate).toHaveBeenCalled();
    expect(mockResize).toHaveBeenCalledWith(200, 100);
    expect(result.contentType).toBe("image/png");
  });

  it("resizes with width only using withoutEnlargement", async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await resizeImage({ buffer, width: 200, contentType: "image/png" });
    expect(mockResize).toHaveBeenCalledWith(200, undefined, { withoutEnlargement: true });
  });

  it("applies AVIF format with reduced quality", async () => {
    const buffer = Buffer.alloc(12);
    await resizeImage({ buffer, width: 200, quality: 80, contentType: "image/avif" });
    expect(mockAvif).toHaveBeenCalledWith({ quality: 60, effort: 3 });
  });

  it("applies WEBP format", async () => {
    const buffer = Buffer.alloc(12);
    await resizeImage({ buffer, width: 200, quality: 80, contentType: "image/webp" });
    expect(mockWebp).toHaveBeenCalledWith({ quality: 80 });
  });

  it("applies PNG format", async () => {
    const buffer = Buffer.alloc(12);
    await resizeImage({ buffer, width: 200, contentType: "image/png" });
    expect(mockPng).toHaveBeenCalledWith({ quality: 100 });
  });

  it("applies JPEG format with mozjpeg", async () => {
    const buffer = Buffer.alloc(12);
    await resizeImage({ buffer, width: 200, quality: 90, contentType: "image/jpeg" });
    expect(mockJpeg).toHaveBeenCalledWith({ quality: 90, mozjpeg: true });
  });

  it("defaults to PNG for unknown content type", async () => {
    const buffer = Buffer.alloc(12);
    const result = await resizeImage({ buffer, width: 200, contentType: "image/bmp" });
    expect(mockPng).toHaveBeenCalledWith({ quality: 100 });
    expect(result.contentType).toBe("image/png");
  });

  it("auto-detects content type when not provided", async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const result = await resizeImage({ buffer, width: 200 });
    expect(result.contentType).toBe("image/jpeg");
  });
});
