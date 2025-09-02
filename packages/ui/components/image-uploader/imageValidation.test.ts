import { describe, it, expect, vi, beforeEach } from "vitest";

import { MAX_BANNER_SIZE } from "@calcom/lib/constants";

import { validateImageFile, MAX_IMAGE_FILE_SIZE } from "./imageValidation";

describe("validateImageFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (bytes: number[], name = "test.png", type = "image/png", size?: number) => {
    const buffer = new ArrayBuffer(bytes.length);
    const view = new Uint8Array(buffer);
    bytes.forEach((byte, index) => {
      view[index] = byte;
    });

    const file = {
      name,
      type,
      size: size !== undefined ? size : bytes.length,
      arrayBuffer: vi.fn().mockResolvedValue(buffer),
    } as unknown as File;

    return file;
  };

  describe("File size validation", () => {
    it("should reject files larger than MAX_IMAGE_FILE_SIZE", async () => {
      const largeFile = createMockFile([0x89, 0x50, 0x4e, 0x47], "large.png", "image/png", 6 * 1024 * 1024);

      const result = await validateImageFile(largeFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("image_size_limit_exceed");
    });

    it("should accept files within size limit", async () => {
      const validFile = createMockFile(
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        "valid.png",
        "image/png",
        1024
      );

      const result = await validateImageFile(validFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should respect custom maxFileSize parameter", async () => {
      const customMaxSize = 2 * 1024 * 1024; // 2MB
      const largeFile = createMockFile([0x89, 0x50, 0x4e, 0x47], "large.png", "image/png", 3 * 1024 * 1024);

      const result = await validateImageFile(largeFile, customMaxSize);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("image_size_limit_exceed");
    });
  });

  describe("Magic number validation - dangerous files", () => {
    it("should reject PDF files", async () => {
      const pdfFile = createMockFile([0x25, 0x50, 0x44, 0x46], "fake.png", "image/png");

      const result = await validateImageFile(pdfFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "PDF" });
    });

    it("should reject HTML files", async () => {
      const htmlFile = createMockFile(
        [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20],
        "fake.png",
        "image/png"
      );

      const result = await validateImageFile(htmlFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "HTML" });
    });

    it("should reject script files", async () => {
      const scriptFile = createMockFile([0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], "fake.png", "image/png");

      const result = await validateImageFile(scriptFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "Script" });
    });

    it("should reject ZIP files", async () => {
      const zipFile = createMockFile([0x50, 0x4b, 0x03, 0x04], "fake.png", "image/png");

      const result = await validateImageFile(zipFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "ZIP" });
    });

    it("should reject executable files", async () => {
      const exeFile = createMockFile([0x4d, 0x5a], "fake.png", "image/png");

      const result = await validateImageFile(exeFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "Executable" });
    });
  });

  describe("Magic number validation - valid images", () => {
    it("should accept PNG files", async () => {
      const pngFile = createMockFile(
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        "test.png",
        "image/png"
      );

      const result = await validateImageFile(pngFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept JPEG files", async () => {
      const jpegFile = createMockFile([0xff, 0xd8, 0xff, 0xe0], "test.jpg", "image/jpeg");

      const result = await validateImageFile(jpegFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept GIF files", async () => {
      const gifFile = createMockFile([0x47, 0x49, 0x46, 0x38, 0x37, 0x61], "test.gif", "image/gif");

      const result = await validateImageFile(gifFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept WEBP files", async () => {
      const webpFile = createMockFile(
        [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
        "test.webp",
        "image/webp"
      );

      const result = await validateImageFile(webpFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept BMP files", async () => {
      const bmpFile = createMockFile([0x42, 0x4d], "test.bmp", "image/bmp");

      const result = await validateImageFile(bmpFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept ICO files", async () => {
      const icoFile = createMockFile([0x00, 0x00, 0x01, 0x00], "test.ico", "image/x-icon");

      const result = await validateImageFile(icoFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("New error format validation", () => {
    it("should return errorKey and errorParams for unsupported file types", async () => {
      const pdfFile = createMockFile([0x25, 0x50, 0x44, 0x46], "fake.png", "image/png");

      const result = await validateImageFile(pdfFile, MAX_IMAGE_FILE_SIZE);

      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("errorKey");
      expect(result).toHaveProperty("errorParams");
      expect(result.isValid).toBe(false);
      expect(result.errorKey).toBe("unsupported_file_type");
      expect(result.errorParams).toEqual({ type: "PDF" });
    });

    it("should return error field for backward compatibility when not using errorKey pattern", async () => {
      const invalidFile = createMockFile([0x00, 0x01, 0x02, 0x03], "invalid.png", "image/png");

      const result = await validateImageFile(invalidFile, MAX_IMAGE_FILE_SIZE);

      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("error");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid_image_file_format");
      expect(result.errorKey).toBeUndefined();
      expect(result.errorParams).toBeUndefined();
    });
  });

  describe("Constants integration", () => {
    it("should use MAX_BANNER_SIZE constant correctly", () => {
      expect(MAX_IMAGE_FILE_SIZE).toBe(MAX_BANNER_SIZE);
      expect(MAX_IMAGE_FILE_SIZE).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe("Edge cases", () => {
    it("should reject files with invalid image format", async () => {
      const invalidFile = createMockFile([0x00, 0x01, 0x02, 0x03], "invalid.png", "image/png");

      const result = await validateImageFile(invalidFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid_image_file_format");
    });

    it("should handle file reading errors gracefully", async () => {
      const errorFile = createMockFile([0x89, 0x50, 0x4e, 0x47], "error.png", "image/png");

      const mockArrayBuffer = vi.fn().mockRejectedValue(new Error("File read error"));
      Object.defineProperty(errorFile, "arrayBuffer", { value: mockArrayBuffer });

      const result = await validateImageFile(errorFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("failed_to_validate_image_file");
    });

    it("should handle empty files", async () => {
      const emptyFile = createMockFile([], "empty.png", "image/png");

      const result = await validateImageFile(emptyFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid_image_file_format");
    });

    it("should handle files with insufficient bytes for magic number detection", async () => {
      const shortFile = createMockFile([0x89], "short.png", "image/png");

      const result = await validateImageFile(shortFile, MAX_IMAGE_FILE_SIZE);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("invalid_image_file_format");
    });
  });
});
