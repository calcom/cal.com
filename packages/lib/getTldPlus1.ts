/**
 * Note: It doesn't support multipart tlds like .co.uk and thus makes only one part tld's safe like .com(and thus cal.com)
 * If we want to use it elsewhere as well(apart from embed/preview.ts) we must consider Public Suffix List
 */
export function getTldPlus1(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}
