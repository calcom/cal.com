import { describe, it, expect } from "vitest";

import { FILE_SIGNATURES } from "@calcom/lib/imageValidationConstants";
import { validateBase64Image } from "@calcom/lib/server/imageValidation";

describe("validateBase64Image", () => {
  const createBase64Data = (bytes: number[], mimeType = "image/png") => {
    const buffer = Buffer.from(bytes);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  };

  describe("Valid image formats", () => {
    it("should validate PNG images", () => {
      const pngBytes = [...FILE_SIGNATURES.PNG, ...Array(10).fill(0)];
      const base64Data = createBase64Data(pngBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("PNG");
      expect(result.error).toBeUndefined();
    });

    it("should validate JPEG images", () => {
      const jpegBytes = [...FILE_SIGNATURES.JPEG_FF_D8_FF, 0xe0, ...Array(10).fill(0)];
      const base64Data = createBase64Data(jpegBytes, "image/jpeg");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("JPEG");
    });

    it("should validate GIF87a images", () => {
      const gifBytes = [...FILE_SIGNATURES.GIF87a, ...Array(10).fill(0)];
      const base64Data = createBase64Data(gifBytes, "image/gif");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("GIF");
    });

    it("should validate GIF89a images", () => {
      const gifBytes = [...FILE_SIGNATURES.GIF89a, ...Array(10).fill(0)];
      const base64Data = createBase64Data(gifBytes, "image/gif");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("GIF");
    });

    it("should validate WEBP images", () => {
      const webpBytes = [
        ...FILE_SIGNATURES.WEBP,
        0x00,
        0x00,
        0x00,
        0x00,
        ...FILE_SIGNATURES.WEBP_SIGNATURE,
        ...Array(10).fill(0),
      ];
      const base64Data = createBase64Data(webpBytes, "image/webp");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("WEBP");
    });

    it("should validate BMP images", () => {
      const bmpBytes = [...FILE_SIGNATURES.BMP, ...Array(10).fill(0)];
      const base64Data = createBase64Data(bmpBytes, "image/bmp");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("BMP");
    });

    it("should validate ICO images", () => {
      const icoBytes = [...FILE_SIGNATURES.ICO, ...Array(10).fill(0)];
      const base64Data = createBase64Data(icoBytes, "image/x-icon");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("ICO");
    });

    it("should validate safe SVG images", () => {
      const svgContent =
        '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      const svgBytes = Array.from(Buffer.from(svgContent, "utf8"));
      const base64Data = createBase64Data(svgBytes, "image/svg+xml");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("SVG");
    });

    it("should validate SVG with direct <svg> tag", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      const svgBytes = Array.from(Buffer.from(svgContent, "utf8"));
      const base64Data = createBase64Data(svgBytes, "image/svg+xml");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("SVG");
    });
  });

  describe("Dangerous file types", () => {
    it("should reject PDF files", () => {
      const pdfBytes = [...FILE_SIGNATURES.PDF, 0x2d, 0x31, 0x2e, 0x34];
      const base64Data = createBase64Data(pdfBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("PDF");
      expect(result.error).toBe("PDF files cannot be uploaded as images");
    });

    it("should reject HTML files with DOCTYPE", () => {
      const htmlBytes = [...FILE_SIGNATURES.HTML];
      const base64Data = createBase64Data(htmlBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("HTML");
      expect(result.error).toBe("HTML files cannot be uploaded as images");
    });

    it("should reject HTML files with <html> tag", () => {
      const htmlBytes = [...FILE_SIGNATURES.HTML_TAG, 0x3e];
      const base64Data = createBase64Data(htmlBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("HTML");
      expect(result.error).toBe("HTML files cannot be uploaded as images");
    });

    it("should reject script files", () => {
      const scriptBytes = [...FILE_SIGNATURES.SCRIPT_TAG];
      const base64Data = createBase64Data(scriptBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("Script");
      expect(result.error).toBe("Script files cannot be uploaded as images");
    });

    it("should reject ZIP files", () => {
      const zipBytes = [...FILE_SIGNATURES.ZIP];
      const base64Data = createBase64Data(zipBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("ZIP");
      expect(result.error).toBe("ZIP files cannot be uploaded as images");
    });

    it("should reject executable files", () => {
      const exeBytes = [...FILE_SIGNATURES.EXECUTABLE];
      const base64Data = createBase64Data(exeBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("Executable");
      expect(result.error).toBe("Executable files cannot be uploaded as images");
    });

    it("should reject SVG with script content", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';
      const svgBytes = Array.from(Buffer.from(svgContent, "utf8"));
      const base64Data = createBase64Data(svgBytes, "image/svg+xml");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("SVG");
      expect(result.error).toBe("SVG contains potentially dangerous content");
    });

    it("should reject SVG with javascript: URLs", () => {
      const svgContent =
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">link</a></svg>';
      const svgBytes = Array.from(Buffer.from(svgContent, "utf8"));
      const base64Data = createBase64Data(svgBytes, "image/svg+xml");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("SVG");
      expect(result.error).toBe("SVG contains potentially dangerous content");
    });

    it("should reject SVG with onload handlers", () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>';
      const svgBytes = Array.from(Buffer.from(svgContent, "utf8"));
      const base64Data = createBase64Data(svgBytes, "image/svg+xml");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("SVG");
      expect(result.error).toBe("SVG contains potentially dangerous content");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty image data", () => {
      const base64Data = "data:image/png;base64,";

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Empty image data");
    });

    it("should handle malformed base64", () => {
      const base64Data = "data:image/png;base64,invalid-base64!@#$";

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid base64 format");
    });

    it("should handle unrecognized file format", () => {
      const unknownBytes = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05];
      const base64Data = createBase64Data(unknownBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("Unknown");
      expect(result.error).toBe("Unrecognized image format or invalid file");
    });

    it("should handle files too short for magic number detection", () => {
      const shortBytes = [0x89];
      const base64Data = createBase64Data(shortBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("Unknown");
      expect(result.error).toBe("Unrecognized image format or invalid file");
    });

    it("should handle WEBP files without proper WEBP signature", () => {
      const fakeWebpBytes = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x46, 0x41, 0x4b, 0x45];
      const base64Data = createBase64Data(fakeWebpBytes);

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(false);
      expect(result.detectedFormat).toBe("Unknown");
      expect(result.error).toBe("Unrecognized image format or invalid file");
    });

    it("should handle base64 data without proper data URL prefix", () => {
      const pngBytes = [...FILE_SIGNATURES.PNG];
      const buffer = Buffer.from(pngBytes);
      const base64Data = buffer.toString("base64");

      const result = validateBase64Image(base64Data);

      expect(result.isValid).toBe(true);
      expect(result.detectedFormat).toBe("PNG");
    });
  });
});
