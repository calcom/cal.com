import { userAgent } from "next/server";

interface BotDetectionResult {
  isBot: boolean;
  userAgent: string;
}

export function detectBot(headers: Headers): BotDetectionResult {
  const { isBot, ua } = userAgent({ headers }); // `ua` is the actual user agent string from the request headers
  const userAgentString = ua ?? "";
  return {
    isBot,
    userAgent: userAgentString,
  };
}
