import { FILE_SIGNATURES, matchesSignature } from "../../../lib/imageValidationConstants";

export interface ImageValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Enhanced browser-compatible image validation with magic number checking
 * This function performs comprehensive validation and returns validation results
 */
export const validateImageFile = async (
  file: File,
  maxFileSize: number = 5 * 1024 * 1024 // Default 5MB
): Promise<ImageValidationResult> => {
  if (file.size > maxFileSize) {
    return { isValid: false, message: "image_size_limit_exceed" };
  }

  if (!file.type.startsWith("image/")) {
    return { isValid: false, message: "only_image_files_allowed" };
  }

  try {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    if (uint8Array.length === 0) {
      return { isValid: false, message: "invalid_image_file_format" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.PDF)) {
      return { isValid: false, message: "pdf_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.HTML)) {
      return { isValid: false, message: "html_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.SCRIPT_TAG)) {
      return { isValid: false, message: "script_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ZIP)) {
      return { isValid: false, message: "zip_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.EXECUTABLE)) {
      return { isValid: false, message: "executable_files_cannot_be_uploaded_as_images" };
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
        matchesSignature(uint8Array.slice(8), FILE_SIGNATURES.WEBP_SIGNATURE));

    if (!isValidImage) {
      return { isValid: false, message: "invalid_image_file_format" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, message: "failed_to_validate_image_file" };
  }
};
