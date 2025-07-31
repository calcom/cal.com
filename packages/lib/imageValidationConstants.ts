/**
 * Shared image validation constants and utilities
 * Used by both server-side and client-side validation modules
 */

/**
 * Magic numbers (file signatures) for different file types
 */
export const FILE_SIGNATURES = {
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  JPEG_FF_D8_FF: [0xff, 0xd8, 0xff],
  GIF87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  GIF89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  WEBP: [0x52, 0x49, 0x46, 0x46],
  WEBP_SIGNATURE: [0x57, 0x45, 0x42, 0x50],
  BMP: [0x42, 0x4d],
  ICO: [0x00, 0x00, 0x01, 0x00],
  SVG: [0x3c, 0x3f, 0x78, 0x6d, 0x6c],
  SVG_DIRECT: [0x3c, 0x73, 0x76, 0x67],

  PDF: [0x25, 0x50, 0x44, 0x46],
  HTML: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45],
  HTML_TAG: [0x3c, 0x68, 0x74, 0x6d, 0x6c],
  SCRIPT_TAG: [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74],
  ZIP: [0x50, 0x4b, 0x03, 0x04],
  EXECUTABLE: [0x4d, 0x5a],
} as const;

/**
 * Check if bytes match a signature
 */
export function matchesSignature(data: Uint8Array, signature: readonly number[]): boolean {
  if (data.length < signature.length) return false;
  return signature.every((byte, index) => data[index] === byte);
}

/**
 * SVG content validation patterns
 */
export const DANGEROUS_SVG_PATTERNS = [
  "<script",
  "javascript:",
  "onload=",
  "onclick=",
  "onmouseover=",
  "onmouseout=",
  "onfocus=",
  "onblur=",
] as const;

/**
 * Validate SVG content for dangerous patterns
 */
export function containsDangerousSVGContent(content: string): boolean {
  return DANGEROUS_SVG_PATTERNS.some((pattern) => content.includes(pattern));
}

/**
 * Base64 regex pattern that matches valid base64 strings
 * - Matches complete base64 groups of 4 characters
 * - Handles proper padding with = characters
 * - Supports both padded and unpadded forms correctly
 */
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=)?$/;

/**
 * Validate base64 string format using strict regex
 */
export function isValidBase64(str: string): boolean {
  return BASE64_REGEX.test(str);
}

/**
 * Maximum image file size (5MB)
 */
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
