import crypto from "node:crypto";

import { XMLParser, XMLValidator } from "fast-xml-parser";

/**
 * BigBlueButton API 调用返回的通用错误类型
 */
export class BbbApiError extends Error {
  readonly messageKey: string;

  constructor(msg: string, messageKey = "unknown_error") {
    super(msg);
    this.messageKey = messageKey;
    this.name = "BbbApiError";
  }
}

/**
 * 根据 BBB API 规范生成 SHA1 校验和
 * 格式: sha1(callName + queryStringWithoutChecksum + sharedSecret)
 */
export function buildChecksum(
  callName: string,
  queryString: string,
  sharedSecret: string
): string {
  const toHash = callName + queryString + sharedSecret;
  return crypto.createHash("sha1").update(toHash).digest("hex");
}

/**
 * 构建签名的 BBB API URL
 * 在查询参数中添加 checksum
 */
export function buildSignedUrl(
  serverUrl: string,
  callName: string,
  queryString: string,
  sharedSecret: string
): string {
  const checksum = buildChecksum(callName, queryString, sharedSecret);
  const separator = queryString ? "&" : "";
  return `${serverUrl}/api/${callName}?${queryString}${separator}checksum=${checksum}`;
}

/**
 * 解析 BBB API 返回的 XML 响应
 * 如果 returncode 不是 SUCCESS，抛出 BbbApiError
 */
export function parseBbbResponse(xmlResponse: string): Record<string, unknown> {
  const validationResult = XMLValidator.validate(xmlResponse);
  if (validationResult !== true) {
    throw new BbbApiError("BBB returned a malformed XML response.", "malformed_xml_response");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xmlResponse);
  const response = parsed.response;

  if (!response) {
    throw new BbbApiError("BBB response missing root <response> element.", "malformed_xml_response");
  }

  if (response.returncode !== "SUCCESS") {
    const messageKey = (response.messageKey as string) || "unknown_error";
    const message = (response.message as string) || "BBB API error";
    throw new BbbApiError(message, messageKey);
  }

  return response as Record<string, unknown>;
}

/**
 * 调用 BigBlueButton API
 * 10 秒超时，自动处理 HTTP 和 XML 层错误
 */
export async function callBbb(
  serverUrl: string,
  callName: string,
  queryString: string,
  sharedSecret: string
): Promise<Record<string, unknown>> {
  const url = buildSignedUrl(serverUrl, callName, queryString, sharedSecret);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (fetchError) {
    if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
      throw new BbbApiError("BBB API request timed out after 10 seconds.", "bbb_timeout");
    }
    throw new BbbApiError(
      `BBB API network error: ${fetchError instanceof Error ? fetchError.message : "Unknown network error"}`,
      "bbb_network_error"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new BbbApiError(
      `BBB HTTP error: ${response.status} ${response.statusText}`,
      "bbb_http_error"
    );
  }

  const xml = await response.text();

  try {
    return parseBbbResponse(xml);
  } catch (e) {
    if (e instanceof BbbApiError) throw e;
    throw new BbbApiError("BBB API returned an unexpected error.", "bbb_unknown_error");
  }
}

/**
 * 生成随机的会议密码
 * 使用加密安全的随机字节，输出为十六进制字符串
 */
export function generateMeetingPassword(): string {
  return crypto.randomBytes(16).toString("hex");
}