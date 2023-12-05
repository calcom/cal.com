import { AppConfig } from "@calcom/web/app-config";

export function extractDomainFromEmail(email: string) {
  let out = "";
  try {
    const match = email.match(/^(?:.*?:\/\/)?.*?(?<root>[\w\-]*(?:\.\w{2,}|\.\w{2,}\.\w{2}))(?:[\/?#:]|$)/);
    out = (match && match.groups?.root) ?? "";
  } catch (ignore) {}
  return out.split(".")[0];
}

export const extractDomainFromWebsiteUrl = AppConfig.env.NEXT_PUBLIC_WEBSITE_URL?.replace(
  "https://",
  ""
)?.replace("http://", "") as string;
