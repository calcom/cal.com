import { describe, expect, it } from "vitest";

import { appConfigSchema } from "../configSchema";

describe("appConfigSchema", () => {
  it("should validate a correct config object", () => {
    const result = appConfigSchema.safeParse({
      name: "QR Code",
      slug: "qr_code",
      type: "qr_code_other",
      logo: "icon.svg",
      url: "https://cal.com/",
      variant: "other",
      categories: ["other"],
      extendsFeature: "EventType",
      publisher: "Cal.com, Inc.",
      email: "support@cal.com",
      description: "Easily generate a QR code for your links to print, share, or embed.",
      __createdUsingCli: true,
    });

    expect(result.success).toBe(true);
  });

  it("should invalidate a config object with incorrect types", () => {
    const result = appConfigSchema.safeParse({
      name: 123, // should be a string
      slug: "qr_code",
      type: "qr_code_other",
      logo: "icon.svg",
      url: "not-a-valid-url", // should be a valid URL
      variant: "other",
      categories: "other", // should be an array
      extendsFeature: "EventType",
      publisher: "Cal.com, Inc.",
      email: "not-an-email", // should be a valid email
      description: "Easily generate a QR code for your links to print, share, or embed.",
      __createdUsingCli: "yes", // should be a boolean
    });

    expect(result.success).toBe(false);
  });
});
