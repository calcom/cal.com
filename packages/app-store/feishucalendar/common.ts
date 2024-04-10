import type logger from "@calcom/lib/logger";

import getAppKeysFromSlug from "../_utils/getAppKeysFromSlug";
import type { FeishuAppKeys } from "./types/FeishuCalendar";

export const FEISHU_HOST = "open.feishu.cn";

export const getAppKeys = () => getAppKeysFromSlug("feishu-calendar") as Promise<FeishuAppKeys>;

export const isExpired = (expiryDate: number) =>
  !expiryDate || expiryDate < Math.round(Number(new Date()) / 1000);

export async function handleFeishuError<T extends { code: number; msg: string }>(
  response: Response,
  log: typeof logger
): Promise<T> {
  const data: T = await response.json();
  if (!response.ok || data.code !== 0) {
    log.error("feishu error with error: ", data, ", logid is:", response.headers.get("X-Tt-Logid"));
    log.debug("feishu request with data", data);
    throw data;
  }
  log.info("feishu request with logid:", response.headers.get("X-Tt-Logid"));
  log.debug("feishu request with data", data);
  return data;
}
