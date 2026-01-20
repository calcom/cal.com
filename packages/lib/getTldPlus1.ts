/**
 * Extracts TLD+1 from hostname (e.g., "cal.com" from "app.cal.com")
 * Note: Doesn't support multi-part TLDs like .co.uk
 */
export function getTldPlus1(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}
