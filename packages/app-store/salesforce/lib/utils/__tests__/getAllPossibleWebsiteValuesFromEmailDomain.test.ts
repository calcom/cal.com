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
});
