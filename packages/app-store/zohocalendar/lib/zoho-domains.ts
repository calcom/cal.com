// Valid Zoho data center domains per https://www.zoho.com/crm/developer/docs/api/v6/multi-dc.html
const LOCATION_TO_DOMAIN: Record<string, string> = {
  us: "com",
  eu: "eu",
  in: "in",
  cn: "com.cn",
  jp: "jp",
  au: "com.au",
};

const DEFAULT_DOMAIN = "com";

export function getValidZohoDomain(location: string | undefined): string {
  return LOCATION_TO_DOMAIN[location || "us"] || DEFAULT_DOMAIN;
}
