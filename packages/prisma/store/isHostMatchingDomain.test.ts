import { describe, it, expect } from "vitest";

import { isHostMatchingDomain } from "./isHostMatchingDomain";

describe("isHostMatchingDomain", () => {
  it("matches identical domains", () => {
    expect(isHostMatchingDomain("cal.com", "cal.com")).toBe(true);
  });
  it("matches a subdomain", () => {
    expect(isHostMatchingDomain("team.cal.com", "cal.com")).toBe(true);
  });
  it("does not match a superdomain", () => {
    expect(isHostMatchingDomain("cal.com", "team.cal.com")).toBe(false);
  });
  it("does not match a different domain", () => {
    expect(isHostMatchingDomain("notcal.com", "cal.com")).toBe(false);
  });
  it("matches a domain with different casing", () => {
    expect(isHostMatchingDomain("Cal.com", "cal.com")).toBe(true);
  });
  it("matches a domain with a port number", () => {
    expect(isHostMatchingDomain("cal.com:3000", "cal.com")).toBe(true);
  });
  it("matches a subdomain with a port number", () => {
    expect(isHostMatchingDomain("team.cal.com:3000", "cal.com")).toBe(true);
  });
  it("matches a domain with different casing and a port number", () => {
    expect(isHostMatchingDomain("Team.Cal.com:3000", "cal.com")).toBe(true);
  });

  // Localhost cases
  it("matches localhost with a port", () => {
    expect(isHostMatchingDomain("localhost:3000", "localhost")).toBe(true);
  });
  it("matches localhost without a port", () => {
    expect(isHostMatchingDomain("localhost", "localhost")).toBe(true);
  });
  it("matches a local subdomain with a port number", () => {
    expect(isHostMatchingDomain("app.cal.local:3000", "app.cal.local")).toBe(true);
  });
});
