/**
 * Server-side image validation utility with magic number checking to prevent XSS attacks
 * This prevents malicious files (like PDFs with embedded JavaScript) from being uploaded as images
 */
import {
  FILE_SIGNATURES,
  matchesSignature,
  containsDangerousSVGContent,
  isValidBase64,
} from "../imageValidationConstants";

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  errorKey?: string;
  errorParams?: Record<string, string | number>;
  detectedFormat?: string;
}

/**
 * Validate base64 image data for magic numbers and content
 */
export function validateBase64Image(base64Data: string): ImageValidationResult {
  try {
    const base64Content = base64Data.replace(/^data:image\/[^;]+;base64,/, "");

    if (!isValidBase64(base64Content)) {
      return { isValid: false, error: "invalid_base64_format" };
    }

    const buffer = Buffer.from(base64Content, "base64");
    const uint8Array = new Uint8Array(buffer);

    if (uint8Array.length === 0) {
      return { isValid: false, error: "empty_image_data" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.PDF)) {
      return {
        isValid: false,
        errorKey: "unsupported_file_type",
        errorParams: { type: "PDF" },
        detectedFormat: "PDF",
      };
    }

    if (
      matchesSignature(uint8Array, FILE_SIGNATURES.HTML) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.HTML_TAG)
    ) {
      return {
        isValid: false,
        errorKey: "unsupported_file_type",
        errorParams: { type: "HTML" },
        detectedFormat: "HTML",
      };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.SCRIPT_TAG)) {
      return {
        isValid: false,
        errorKey: "unsupported_file_type",
        errorParams: { type: "Script" },
        detectedFormat: "Script",
      };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ZIP)) {
      return {
        isValid: false,
        errorKey: "unsupported_file_type",
        errorParams: { type: "ZIP" },
        detectedFormat: "ZIP",
      };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.EXECUTABLE)) {
      return {
        isValid: false,
        errorKey: "unsupported_file_type",
        errorParams: { type: "Executable" },
        detectedFormat: "Executable",
      };
    }

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

    if (matchesSignature(uint8Array, FILE_SIGNATURES.WEBP) && uint8Array.length >= 12) {
      if (matchesSignature(uint8Array.slice(8), FILE_SIGNATURES.WEBP_SIGNATURE)) {
        return { isValid: true, detectedFormat: "WEBP" };
      }
    }

    if (
      matchesSignature(uint8Array, FILE_SIGNATURES.SVG) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.SVG_DIRECT)
    ) {
      const textContent = buffer.toString("utf8");

      if (containsDangerousSVGContent(textContent)) {
        return { isValid: false, error: "svg_contains_dangerous_content", detectedFormat: "SVG" };
      }

      return { isValid: true, detectedFormat: "SVG" };
    }

    return { isValid: false, error: "unrecognized_image_format", detectedFormat: "Unknown" };
  } catch (error) {
    return { isValid: false, error: "failed_to_validate_image_file" };
  }
}
