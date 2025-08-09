import {
  FILE_SIGNATURES,
  matchesSignature,
  containsDangerousSVGContent,
} from "@calcom/lib/imageValidationConstants";

import { MAX_IMAGE_FILE_SIZE } from "./imageValidation.test";

/**
 * Enhanced browser-compatible image validation with magic number checking
 * Returns validation result with error message for the caller to handle
 */
export const validateImageFile = async (
  file: File,
  maxFileSize: number = MAX_IMAGE_FILE_SIZE
): Promise<{ isValid: boolean; error?: string }> => {
  if (file.size > maxFileSize) {
    return { isValid: false, error: "image_size_limit_exceed" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (uint8Array.length === 0) {
      return { isValid: false, error: "invalid_image_file_format" };
    }

    // Check for dangerous file types first
    if (matchesSignature(uint8Array, FILE_SIGNATURES.PDF)) {
      return { isValid: false, error: "pdf_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.HTML)) {
      return { isValid: false, error: "html_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.SCRIPT_TAG)) {
      return { isValid: false, error: "script_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ZIP)) {
      return { isValid: false, error: "zip_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.EXECUTABLE)) {
      return { isValid: false, error: "executable_files_cannot_be_uploaded_as_images" };
    }

    const isValidImage =
      matchesSignature(uint8Array, FILE_SIGNATURES.PNG) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.JPEG_FF_D8_FF) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.GIF87a) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.GIF89a) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.BMP) ||
      matchesSignature(uint8Array, FILE_SIGNATURES.ICO) ||
      (matchesSignature(uint8Array, FILE_SIGNATURES.WEBP) &&
        uint8Array.length >= 12 &&
        matchesSignature(uint8Array.slice(8), FILE_SIGNATURES.WEBP_SIGNATURE)) ||
      // SVG validation with content scanning
      ((matchesSignature(uint8Array, FILE_SIGNATURES.SVG) ||
        matchesSignature(uint8Array, FILE_SIGNATURES.SVG_DIRECT)) &&
        !containsDangerousSVGContent(new TextDecoder().decode(uint8Array)));

    if (!isValidImage) {
      return { isValid: false, error: "invalid_image_file_format" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "failed_to_validate_image_file" };
  }
};
