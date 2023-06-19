import { describe, expect, it } from "vitest";

import { orgDomainConfig, getOrgDomain } from "@calcom/features/ee/organizations/lib/orgDomains";

import * as constants from "@calcom/lib/constants";

describe("Org Domains Utils", () => {
  describe("orgDomainConfig", () => {
    it("should return a valid org domain", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"https://app.cal.com"});
      expect(orgDomainConfig("acme.cal.com")).toEqual({
        currentOrgDomain: "acme",
        isValidOrgDomain: true
      });
    });

    it("should return a non valid org domain", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"https://app.cal.com"});
      expect(orgDomainConfig("app.cal.com")).toEqual({
        currentOrgDomain: "app",
        isValidOrgDomain: false
      });
    });
  });

  describe("getOrgDomain", () => {
    it("should handle a prod web app url with a prod subdomain hostname", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"https://app.cal.com"});
      expect(getOrgDomain("acme.cal.com")).toEqual("acme");
    });

    it("should handle a prod web app url with a staging subdomain hostname", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"https://app.cal.com"});
      expect(getOrgDomain("acme.cal.dev")).toEqual(null);
    });

    it("should handle a local web app with port url with a local subdomain hostname", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"http://app.cal.local:3000"});
      expect(getOrgDomain("acme.cal.local:3000")).toEqual("acme");
    });

    it("should handle a local web app with port url with a non-local subdomain hostname", () => {
      Object.defineProperty(constants, 'WEBAPP_URL', {value:"http://app.cal.local:3000"});
      expect(getOrgDomain("acme.cal.com:3000")).toEqual(null);
    });
  })
});
