import { getEnv } from "@/env";

function subdomainSuffix(): string {
  const webAppUrl = getEnv("WEB_APP_URL", "https://app.cal.com");
  const urlSplit = webAppUrl.replace("https://", "").replace("http://", "").split(".");
  return urlSplit.length === 3 ? urlSplit.slice(1).join(".") : urlSplit.join(".");
}

export function getOrgFullOrigin(
  slug: string | null,
  options: { protocol: boolean } = { protocol: true }
): string {
  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || getEnv("WEB_APP_URL", "https://app.cal.com");

  if (!slug) {
    return options.protocol ? websiteUrl : websiteUrl.replace("https://", "").replace("http://", "");
  }

  const protocol = options.protocol ? `${new URL(websiteUrl).protocol}//` : "";
  const orgFullOrigin = `${protocol}${slug}.${subdomainSuffix()}`;

  return orgFullOrigin;
}
