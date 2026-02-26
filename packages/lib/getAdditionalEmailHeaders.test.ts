import { describe, expect, it } from "vitest";
import { getAdditionalEmailHeaders } from "./getAdditionalEmailHeaders";

describe("getAdditionalEmailHeaders", () => {
  it("returns an object with smtp.sendgrid.net key", () => {
    const headers = getAdditionalEmailHeaders();
    expect(headers).toHaveProperty("smtp.sendgrid.net");
  });

  it("includes X-SMTPAPI header for sendgrid", () => {
    const headers = getAdditionalEmailHeaders();
    expect(headers["smtp.sendgrid.net"]).toHaveProperty("X-SMTPAPI");
  });

  it("X-SMTPAPI is valid JSON", () => {
    const headers = getAdditionalEmailHeaders();
    const parsed = JSON.parse(headers["smtp.sendgrid.net"]["X-SMTPAPI"]);
    expect(parsed).toBeDefined();
  });

  it("X-SMTPAPI contains bypass_list_management filter", () => {
    const headers = getAdditionalEmailHeaders();
    const parsed = JSON.parse(headers["smtp.sendgrid.net"]["X-SMTPAPI"]);
    expect(parsed.filters.bypass_list_management.settings.enable).toBe(1);
  });

  it("does not include headers for unknown hosts", () => {
    const headers = getAdditionalEmailHeaders();
    const keys = Object.keys(headers);
    expect(keys).toEqual(["smtp.sendgrid.net"]);
  });
});
