import type logger from "@calcom/lib/logger";

import getAppKeysFromSlug from "../_utils/getAppKeysFromSlug";
import type { LarkAppKeys } from "./types/LarkCalendar";

export const LARK_HOST = "open.larksuite.com";

export const getAppKeys = () => getAppKeysFromSlug("lark-calendar") as Promise<LarkAppKeys>;

export const isExpired = (expiryDate: number) =>
  !expiryDate || expiryDate < Math.round(Number(new Date()) / 1000);

export async function handleLarkError<T extends { code: number; msg: string }>(
  response: Response,
  log: typeof logger
): Promise<T> {
  const data: T = await response.json();
  if (!response.ok || data.code !== 0) {
    log.error("lark error with error: ", data, ", logid is:", response.headers.get("X-Tt-Logid"));
    log.debug("lark request with data", data);
    throw data;
  }
  log.info("lark request with logid:", response.headers.get("X-Tt-Logid"));
  log.debug("lark request with data", data);
  return data;
}
