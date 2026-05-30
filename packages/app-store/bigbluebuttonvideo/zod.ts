import { z } from "zod";

/**
 * BigBlueButton 凭证密钥的 Zod 验证模式
 * serverUrl: BBB 服务器的基础 URL
 * sharedSecret: BBB 服务器的共享密钥，用于 API 签名
 */
export const bbbCredentialKeySchema = z.object({
  serverUrl: z.string().url(),
  sharedSecret: z.string().trim().min(1),
});

export const appKeysSchema = z.object({});

export const appDataSchema = z.object({});