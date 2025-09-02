import {
  FILE_SIGNATURES,
  matchesSignature,
  containsDangerousSVGContent,
} from "@calcom/lib/imageValidationConstants";

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

const stripBomAndWhitespace = (data: Uint8Array): Uint8Array => {
  let start = 0;

  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
    start = 3;
  }

  while (start < data.length) {
    const byte = data[start];
    if (byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x0c || byte === 0x0b) {
      start++;
    } else {
      break;
    }
  }

  return data.slice(start);
};

const checkTextBasedDangerousSignature = (data: Uint8Array): string | null => {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(data).toLowerCase();

  if (
    text.includes("<!doctype") ||
    text.includes("<html") ||
    matchesSignature(data, FILE_SIGNATURES.HTML)
  ) {
    return "html_files_cannot_be_uploaded_as_images";
  }

  if (text.includes("<script") || matchesSignature(data, FILE_SIGNATURES.SCRIPT_TAG)) {
    return "script_files_cannot_be_uploaded_as_images";
  }

  return null;
};

const createTrimmedTextHead = (text: string, maxLength = 512): Uint8Array => {
  let trimmedText = text.replace(/^[\uFEFF\s]+/, "");

  if (trimmedText.length > maxLength) {
    trimmedText = trimmedText.substring(0, maxLength);
  }

  return new TextEncoder().encode(trimmedText);
};

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

    const strippedData = stripBomAndWhitespace(uint8Array);

    if (strippedData.length === 0) {
      return { isValid: false, error: "invalid_image_file_format" };
    }

    const trimmedHead = strippedData.slice(0, 512);

    const textBasedError = checkTextBasedDangerousSignature(trimmedHead);
    if (textBasedError) {
      return { isValid: false, error: textBasedError };
    }

    if (matchesSignature(trimmedHead, FILE_SIGNATURES.PDF)) {
      return { isValid: false, error: "pdf_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(trimmedHead, FILE_SIGNATURES.ZIP)) {
      return { isValid: false, error: "zip_files_cannot_be_uploaded_as_images" };
    }

    if (matchesSignature(trimmedHead, FILE_SIGNATURES.EXECUTABLE)) {
      return { isValid: false, error: "executable_files_cannot_be_uploaded_as_images" };
    }

    const isValidImage =
      matchesSignature(trimmedHead, FILE_SIGNATURES.PNG) ||
      matchesSignature(trimmedHead, FILE_SIGNATURES.JPEG_FF_D8_FF) ||
      matchesSignature(trimmedHead, FILE_SIGNATURES.GIF87a) ||
      matchesSignature(trimmedHead, FILE_SIGNATURES.GIF89a) ||
      matchesSignature(trimmedHead, FILE_SIGNATURES.BMP) ||
      matchesSignature(trimmedHead, FILE_SIGNATURES.ICO) ||
      (matchesSignature(trimmedHead, FILE_SIGNATURES.WEBP) &&
        trimmedHead.length >= 12 &&
        matchesSignature(trimmedHead.slice(8), FILE_SIGNATURES.WEBP_SIGNATURE)) ||
      (() => {
        const fullText = new TextDecoder("utf-8", { fatal: false }).decode(strippedData);

        const svgTrimmedHead = createTrimmedTextHead(fullText);

        return (
          (matchesSignature(svgTrimmedHead, FILE_SIGNATURES.SVG) ||
            matchesSignature(svgTrimmedHead, FILE_SIGNATURES.SVG_DIRECT)) &&
          !containsDangerousSVGContent(fullText)
        );
      })();

    if (!isValidImage) {
      return { isValid: false, error: "invalid_image_file_format" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "failed_to_validate_image_file" };
  }
};
