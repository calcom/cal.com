const IMAGE_SIGNATURES = {
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  JPEG: [0xff, 0xd8, 0xff],
  GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF header, followed by WEBP
  BMP: [0x42, 0x4d],
  SVG: [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml or <svg
  SVG_DIRECT: [0x3c, 0x73, 0x76, 0x67], // <svg
} as const;

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF

export interface ImageValidationResult {
  isValid: boolean;
  detectedType: string | null;
  error?: string;
}

/**
 * Validates if a buffer contains a valid image by checking magic numbers
 */
export function validateImageMagicNumbers(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length < 8) {
    return {
      isValid: false,
      detectedType: null,
      error: "Buffer too small or empty",
    };
  }

  if (matchesSignature(buffer, PDF_SIGNATURE)) {
    return {
      isValid: false,
      detectedType: "application/pdf",
      error: "PDF files are not allowed as images",
    };
  }

  if (matchesSignature(buffer, IMAGE_SIGNATURES.PNG)) {
    return { isValid: true, detectedType: "image/png" };
  }

  if (matchesSignature(buffer, IMAGE_SIGNATURES.JPEG)) {
    return { isValid: true, detectedType: "image/jpeg" };
  }

  if (
    matchesSignature(buffer, IMAGE_SIGNATURES.GIF87A) ||
    matchesSignature(buffer, IMAGE_SIGNATURES.GIF89A)
  ) {
    return { isValid: true, detectedType: "image/gif" };
  }

  if (matchesSignature(buffer, IMAGE_SIGNATURES.BMP)) {
    return { isValid: true, detectedType: "image/bmp" };
  }

  if (matchesSignature(buffer, IMAGE_SIGNATURES.WEBP) && buffer.length >= 12) {
    const webpSignature = buffer.subarray(8, 12);
    if (webpSignature.toString() === "WEBP") {
      return { isValid: true, detectedType: "image/webp" };
    }
  }

  if (
    matchesSignature(buffer, IMAGE_SIGNATURES.SVG) ||
    matchesSignature(buffer, IMAGE_SIGNATURES.SVG_DIRECT)
  ) {
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 1024));
    if (content.includes("<script") || content.includes("javascript:") || content.includes("onload=")) {
      return {
        isValid: false,
        detectedType: "image/svg+xml",
        error: "SVG contains potentially malicious content",
      };
    }
    return { isValid: true, detectedType: "image/svg+xml" };
  }

  return {
    isValid: false,
    detectedType: null,
    error: "Unrecognized or invalid image format",
  };
}

/**
 * Validates a base64 image string
 */
export function validateBase64Image(base64Data: string): ImageValidationResult {
  try {
    const base64Content = base64Data.replace(/^data:image\/[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");

    return validateImageMagicNumbers(buffer);
  } catch (error) {
    return {
      isValid: false,
      detectedType: null,
      error: "Invalid base64 data",
    };
  }
}

/**
 * Helper function to check if buffer matches a signature
 */
function matchesSignature(buffer: Buffer, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Determines the correct MIME type based on magic numbers
 */
export function getValidatedMimeType(buffer: Buffer): string {
  const validation = validateImageMagicNumbers(buffer);
  return validation.isValid && validation.detectedType ? validation.detectedType : "application/octet-stream";
}
