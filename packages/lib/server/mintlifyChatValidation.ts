/**
 * Validation and sanitization helpers for Mintlify chat proxy
 * 
 * This module provides security utilities to validate user input before
 * proxying requests to the Mintlify API, preventing:
 * - Path traversal attacks
 * - Control character injection
 * - Malicious payloads
 * - Oversized requests
 */

const MAX_MESSAGE_LENGTH = 10000; // 10KB max message length
const MAX_TOPIC_ID_LENGTH = 200;

/**
 * Validates that a string contains only safe characters
 * Rejects control characters, null bytes, and path traversal sequences
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Remove other control characters (except newlines, tabs, carriage returns which might be needed in messages)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // Check for path traversal attempts
  if (sanitized.includes("../") || sanitized.includes("..\\")) {
    throw new Error("Path traversal detected");
  }

  return sanitized;
}

/**
 * Validates a chat message payload for the /message endpoint
 */
export function validateChatMessage(payload: unknown): {
  message: string;
  topicId: string;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload: must be an object");
  }

  const { message, topicId } = payload as Record<string, unknown>;

  // Validate message
  if (typeof message !== "string") {
    throw new Error("Invalid message: must be a string");
  }

  if (message.length === 0) {
    throw new Error("Invalid message: cannot be empty");
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Invalid message: exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
  }

  // Validate topicId
  if (typeof topicId !== "string") {
    throw new Error("Invalid topicId: must be a string");
  }

  if (topicId.length === 0) {
    throw new Error("Invalid topicId: cannot be empty");
  }

  if (topicId.length > MAX_TOPIC_ID_LENGTH) {
    throw new Error(`Invalid topicId: exceeds maximum length of ${MAX_TOPIC_ID_LENGTH} characters`);
  }

  // Sanitize both fields
  const sanitizedMessage = sanitizeString(message);
  const sanitizedTopicId = sanitizeString(topicId);

  // Validate topicId format (alphanumeric, dashes, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedTopicId)) {
    throw new Error("Invalid topicId: must contain only alphanumeric characters, dashes, and underscores");
  }

  return {
    message: sanitizedMessage,
    topicId: sanitizedTopicId,
  };
}

/**
 * Validates that the API key and base URL are configured
 */
export function validateMintlifyConfig(): {
  apiKey: string;
  apiBaseUrl: string;
} {
  const apiKey = process.env.MINTLIFY_CHAT_API_KEY;
  const apiBaseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL;

  if (!apiKey) {
    throw new Error("MINTLIFY_CHAT_API_KEY is not configured");
  }

  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_CHAT_API_URL is not configured");
  }

  return { apiKey, apiBaseUrl };
}

/**
 * Sanitizes response headers before sending to client
 * Only allows safe headers through
 */
export function sanitizeResponseHeaders(headers: Headers): Record<string, string> {
  const allowedHeaders = ["content-type", "x-mintlify-base-url"];
  const sanitized: Record<string, string> = {};

  allowedHeaders.forEach((header) => {
    const value = headers.get(header);
    if (value) {
      sanitized[header] = value;
    }
  });

  return sanitized;
}

