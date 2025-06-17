import { userAgent } from "next/server";

interface BotDetectionResult {
  isBot: boolean;
  source: "vercel" | "nextjs";
  userAgent: string;
}

export function detectBot(headers: Headers): BotDetectionResult {
  const { isBot, ua } = userAgent({ headers }); // `ua` is the actual user agent string from the request headers
  const vercelBotHeader = headers.get("x-vercel-bot") === "1";
  const userAgentString = ua ?? "";

  if (vercelBotHeader) {
    return {
      isBot: true,
      source: "vercel",
      userAgent: userAgentString,
    };
  }

  if (isBot) {
    return {
      isBot: true,
      source: "nextjs",
      userAgent: userAgentString,
    };
  }

  return {
    isBot: false,
    source: "nextjs",
    userAgent: userAgentString,
  };
}
