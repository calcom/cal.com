import { describe, expect, it } from "vitest";
import getAllPossibleWebsiteValuesFromEmailDomain from "../getAllPossibleWebsiteValuesFromEmailDomain";

describe("getAllPossibleWebsiteValuesFromEmailDomain", () => {
  it("should return all possible website values from email domain", () => {
    const emailDomain = "example.com";

    const websiteValues = getAllPossibleWebsiteValuesFromEmailDomain(emailDomain);

    expect(websiteValues).toEqual([
      emailDomain,
      `www.${emailDomain}`,
      `http://www.${emailDomain}`,
      `http://${emailDomain}`,
      `https://www.${emailDomain}`,
      `https://${emailDomain}`,
    ]);
  });

  it("should return exactly 6 variants with no duplicates", () => {
    const result = getAllPossibleWebsiteValuesFromEmailDomain("acme.com");
    expect(result).toHaveLength(6);
    expect(new Set(result).size).toBe(6);
  });
});
