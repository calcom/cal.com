import logger from "@lib/logger";
import prisma from "@lib/prisma";

import { INTEGRATION_CREDENTIAL_KEY } from "./AppCredential";

export const LARK_HOST = "open.feishu-boe.cn";

export const LARK_OPEN_APP_ID = process.env.LARK_OPEN_APP_ID || "";
export const LARK_OPEN_APP_SECRET = process.env.LARK_OPEN_APP_SECRET || "";
export const LARK_OPEN_VERIFICATION_TOKEN = process.env.LARK_OPEN_VERIFICATION_TOKEN || "";

export async function handleLarkError<T extends { code: number; msg: string }>(
  response: Response,
  log: typeof logger
): Promise<T> {
  const data: T = await response.json();
  if (!response.ok || data.code !== 0) {
    log.error("lark error with error: ", data, ", logid is:", response.headers.get("X-Tt-Logid"));
    // appticket invalid
    if (data.code === 10012) {
      await prisma.integrationCredential.delete({
        where: {
          key: INTEGRATION_CREDENTIAL_KEY,
        },
      });
    }
    throw data;
  }
  return data;
}

export const isExpired = (expiryDate: number) =>
  !expiryDate || expiryDate < Math.round(Number(new Date()) / 1000);
