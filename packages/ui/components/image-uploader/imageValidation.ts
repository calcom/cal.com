import {
  FILE_SIGNATURES,
  matchesSignature,
  MAX_IMAGE_FILE_SIZE,
} from "../../../lib/imageValidationConstants";
import { showToast } from "../toast";

/**
 * Enhanced browser-compatible image validation with magic number checking
 * This function performs comprehensive validation and shows toast messages directly
 */
export const validateImageFile = async (file: File, t: (key: string) => string): Promise<boolean> => {
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    showToast(t("image_size_limit_exceed"), "error");
    return false;
  }

  if (!file.type.startsWith("image/")) {
    showToast(t("only_image_files_allowed"), "error");
    return false;
  }

  try {
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    if (uint8Array.length === 0) {
      showToast(t("invalid_image_file_format"), "error");
      return false;
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.PDF)) {
      showToast(t("pdf_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.HTML)) {
      showToast(t("html_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.SCRIPT_TAG)) {
      showToast(t("script_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.ZIP)) {
      showToast(t("zip_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    if (matchesSignature(uint8Array, FILE_SIGNATURES.EXECUTABLE)) {
      showToast(t("executable_files_cannot_be_uploaded_as_images"), "error");
      return false;
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
      showToast(t("invalid_image_file_format"), "error");
      return false;
    }

    return true;
  } catch (error) {
    showToast(t("failed_to_validate_image_file"), "error");
    return false;
  }
};
