import logger from "@lib/logger";

export const LARK_HOST = "open.feishu-boe.cn";

export const LARK_OPEN_APP_ID = process.env.LARK_OPEN_APP_ID || "";
export const LARK_OPEN_APP_SECRET = process.env.LARK_OPEN_APP_SECRET || "";
export const LARK_OPEN_VERIFICATION_TOKEN = process.env.LARK_OPEN_VERIFICATION_TOKEN || "";

export async function handleLarkError<T extends { code: number; msg: string }>(
  response: Response,
  log: typeof logger
): Promise<T> {
  if (!response.ok) {
    response.json().then(log.error);
    throw Error(response.statusText);
  }

  const data: T = await response.json();
  if (data.code !== 0) {
    log.error("lark error with none 0 code: ", data, response.headers.get("X-Log-Id"));
    throw Error(data.msg);
  }
  return data;
}

export const isExpired = (expiryDate: number) =>
  !expiryDate || expiryDate < Math.round(Number(new Date()) / 1000);
