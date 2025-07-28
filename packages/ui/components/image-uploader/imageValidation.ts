import { showToast } from "../toast";

/**
 * Enhanced browser-compatible image validation with magic number checking
 * This function performs comprehensive validation and shows toast messages directly
 */
export const validateImageFile = async (file: File, t: (key: string) => string): Promise<boolean> => {
  const limit = 5 * 1000000; // max limit 5mb
  if (file.size > limit) {
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

    // Check for dangerous file types first - PDF detection
    if (
      uint8Array.length >= 4 &&
      uint8Array[0] === 0x25 &&
      uint8Array[1] === 0x50 &&
      uint8Array[2] === 0x44 &&
      uint8Array[3] === 0x46
    ) {
      showToast(t("pdf_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    // Check for HTML content
    if (
      uint8Array.length >= 10 &&
      uint8Array[0] === 0x3c &&
      uint8Array[1] === 0x21 &&
      uint8Array[2] === 0x44 &&
      uint8Array[3] === 0x4f &&
      uint8Array[4] === 0x43 &&
      uint8Array[5] === 0x54 &&
      uint8Array[6] === 0x59 &&
      uint8Array[7] === 0x50 &&
      uint8Array[8] === 0x45 &&
      uint8Array[9] === 0x20
    ) {
      showToast(t("html_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    // Check for script tags
    if (
      uint8Array.length >= 7 &&
      uint8Array[0] === 0x3c &&
      uint8Array[1] === 0x73 &&
      uint8Array[2] === 0x63 &&
      uint8Array[3] === 0x72 &&
      uint8Array[4] === 0x69 &&
      uint8Array[5] === 0x70 &&
      uint8Array[6] === 0x74
    ) {
      showToast(t("script_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    // Check for ZIP files
    if (
      uint8Array.length >= 4 &&
      uint8Array[0] === 0x50 &&
      uint8Array[1] === 0x4b &&
      uint8Array[2] === 0x03 &&
      uint8Array[3] === 0x04
    ) {
      showToast(t("zip_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    // Check for executable files
    if (uint8Array.length >= 2 && uint8Array[0] === 0x4d && uint8Array[1] === 0x5a) {
      showToast(t("executable_files_cannot_be_uploaded_as_images"), "error");
      return false;
    }

    // Check for valid image formats
    const isValidImage =
      // PNG
      (uint8Array.length >= 8 &&
        uint8Array[0] === 0x89 &&
        uint8Array[1] === 0x50 &&
        uint8Array[2] === 0x4e &&
        uint8Array[3] === 0x47) ||
      // JPEG
      (uint8Array.length >= 3 &&
        uint8Array[0] === 0xff &&
        uint8Array[1] === 0xd8 &&
        uint8Array[2] === 0xff) ||
      // GIF
      (uint8Array.length >= 6 &&
        uint8Array[0] === 0x47 &&
        uint8Array[1] === 0x49 &&
        uint8Array[2] === 0x46 &&
        uint8Array[3] === 0x38) ||
      // WEBP (RIFF followed by WEBP)
      (uint8Array.length >= 12 &&
        uint8Array[0] === 0x52 &&
        uint8Array[1] === 0x49 &&
        uint8Array[2] === 0x46 &&
        uint8Array[3] === 0x46 &&
        uint8Array[8] === 0x57 &&
        uint8Array[9] === 0x45 &&
        uint8Array[10] === 0x42 &&
        uint8Array[11] === 0x50) ||
      // BMP
      (uint8Array.length >= 2 && uint8Array[0] === 0x42 && uint8Array[1] === 0x4d) ||
      // ICO
      (uint8Array.length >= 4 &&
        uint8Array[0] === 0x00 &&
        uint8Array[1] === 0x00 &&
        uint8Array[2] === 0x01 &&
        uint8Array[3] === 0x00);

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
