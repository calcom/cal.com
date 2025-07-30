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
  detectedFormat?: string;
}

/**
 * Validate base64 image data for magic numbers and content
 */
export function validateBase64Image(base64Data: string): ImageValidationResult {
  try {
    const base64Content = base64Data.replace(/^data:image\/[^;]+;base64,/, "");

    if (!isValidBase64(base64Content)) {
      return { isValid: false, error: "Invalid base64 format" };
    }

    const buffer = Buffer.from(base64Content, "base64");
    const uint8Array = new Uint8Array(buffer);

    if (uint8Array.length === 0) {
      return { isValid: false, error: "Empty image data" };
    }

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
        return { isValid: false, error: "SVG contains potentially dangerous content", detectedFormat: "SVG" };
      }

      return { isValid: true, detectedFormat: "SVG" };
    }

    return { isValid: false, error: "Unrecognized image format or invalid file", detectedFormat: "Unknown" };
  } catch (error) {
    return { isValid: false, error: "Failed to validate image data" };
  }
}
