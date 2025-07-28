/**
 * Image validation utility with magic number checking to prevent XSS attacks
 * This prevents malicious files (like PDFs with embedded JavaScript) from being uploaded as images
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  detectedFormat?: string;
}

/**
 * Magic numbers (file signatures) for different file types
 */
const FILE_SIGNATURES = {
  // Image formats (allowed)
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  JPEG_FF_D8_FF: [0xff, 0xd8, 0xff],
  GIF87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  GIF89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF (followed by WEBP)
  BMP: [0x42, 0x4d],
  ICO: [0x00, 0x00, 0x01, 0x00],
  SVG: [0x3c, 0x3f, 0x78, 0x6d, 0x6c], // <?xml or <svg
  SVG_DIRECT: [0x3c, 0x73, 0x76, 0x67], // <svg

  // Dangerous formats (blocked)
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  HTML: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45], // <!DOCTYPE
  HTML_TAG: [0x3c, 0x68, 0x74, 0x6d, 0x6c], // <html
  SCRIPT_TAG: [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
  ZIP: [0x50, 0x4b, 0x03, 0x04], // ZIP files
  EXECUTABLE: [0x4d, 0x5a], // Windows executable
};

/**
 * Check if bytes match a signature
 */
function matchesSignature(data: Uint8Array, signature: number[]): boolean {
  if (data.length < signature.length) return false;
  return signature.every((byte, index) => data[index] === byte);
}

/**
 * Validate base64 image data for magic numbers and content
 */
export function validateBase64Image(base64Data: string): ImageValidationResult {
  try {
    // Extract base64 content
    const base64Content = base64Data.replace(/^data:image\/[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Content, "base64");
    const uint8Array = new Uint8Array(buffer);

    if (uint8Array.length === 0) {
      return { isValid: false, error: "Empty image data" };
    }

    // Check for dangerous file types first
    if (matchesSignature(uint8Array, FILE_SIGNATURES.PDF)) {
      return { isValid: false, error: "PDF files cannot be uploaded as images", detectedFormat: "PDF" };
    }

    if (
      matchesSignature(uint8Array, FILE_SIGNATURES.HTML) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.HTML_TAG)
    ) {
      return { isValid: false, error: "HTML files cannot be uploaded as images", detectedFormat: "HTML" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.SCRIPT_TAG)) {
      return { isValid: false, error: "Script files cannot be uploaded as images", detectedFormat: "Script" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ZIP)) {
      return { isValid: false, error: "ZIP files cannot be uploaded as images", detectedFormat: "ZIP" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.EXECUTABLE)) {
      return {
        isValid: false,
        error: "Executable files cannot be uploaded as images",
        detectedFormat: "Executable",
      };
    }

    // Check for valid image formats
    if (matchesSignature(uint8Array, FILE_SIGNATURES.PNG)) {
      return { isValid: true, detectedFormat: "PNG" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.JPEG_FF_D8_FF)) {
      return { isValid: true, detectedFormat: "JPEG" };
    }

    if (
      matchesSignature(uint8Array, FILE_SIGNATURES.GIF87a) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.GIF89a)
    ) {
      return { isValid: true, detectedFormat: "GIF" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.BMP)) {
      return { isValid: true, detectedFormat: "BMP" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ICO)) {
      return { isValid: true, detectedFormat: "ICO" };
    }

    // Special handling for WEBP (check for WEBP after RIFF)
    if (matchesSignature(uint8Array, FILE_SIGNATURES.WEBP) && uint8Array.length >= 12) {
      const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      if (matchesSignature(uint8Array.slice(8), webpSignature)) {
        return { isValid: true, detectedFormat: "WEBP" };
      }
    }

    // SVG validation (more careful because it's text-based)
    if (
      matchesSignature(uint8Array, FILE_SIGNATURES.SVG) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.SVG_DIRECT)
    ) {
      const textContent = buffer.toString("utf8");

      // Check for dangerous SVG content
      if (
        textContent.includes("<script") ||
        textContent.includes("javascript:") ||
        textContent.includes("onload=")
      ) {
        return { isValid: false, error: "SVG contains potentially dangerous content", detectedFormat: "SVG" };
      }

      return { isValid: true, detectedFormat: "SVG" };
    }

    return { isValid: false, error: "Unrecognized image format or invalid file", detectedFormat: "Unknown" };
  } catch (error) {
    return { isValid: false, error: "Failed to validate image data" };
  }
}

/**
 * Validate file object (for frontend use)
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  try {
    // Basic file type check
    if (!file.type.startsWith("image/")) {
      return { isValid: false, error: "Only image files are allowed" };
    }

    // Size check (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { isValid: false, error: "File size exceeds 5MB limit" };
    }

    // Read file as array buffer for magic number checking
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64 for unified validation
    const base64 = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString("base64")}`;

    return validateBase64Image(base64);
  } catch (error) {
    return { isValid: false, error: "Failed to validate image file" };
  }
}

/**
 * Validate MIME type against actual content
 */
export function validateMimeType(base64Data: string, expectedMimeType: string): boolean {
  const validation = validateBase64Image(base64Data);
  if (!validation.isValid || !validation.detectedFormat) return false;

  const detectedFormat = validation.detectedFormat.toLowerCase();
  const expectedFormat = expectedMimeType.toLowerCase().replace("image/", "");

  // Handle JPEG variations
  if (
    (detectedFormat === "jpeg" && (expectedFormat === "jpg" || expectedFormat === "jpeg")) ||
    (expectedFormat === "jpeg" && detectedFormat === "jpeg")
  ) {
    return true;
  }

  return detectedFormat === expectedFormat;
}
