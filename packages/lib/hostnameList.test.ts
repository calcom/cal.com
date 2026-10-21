import { describe, expect, it } from "vitest";
import { parseHostnameList } from "./constants";

describe("parseHostnameList", () => {
  it("should return empty list when unset or blank", () => {
    expect(parseHostnameList(undefined)).toEqual([]);
    expect(parseHostnameList("")).toEqual([]);
    expect(parseHostnameList("   ")).toEqual([]);
  });

  it("should parse the documented quoted form", () => {
    expect(parseHostnameList('"cal.local:3000","localhost:3000"')).toEqual([
      "cal.local:3000",
      "localhost:3000",
    ]);
  });

  it("should parse bare comma-separated hostnames", () => {
    expect(parseHostnameList("subdomain.domain.com,localhost:3000")).toEqual([
      "subdomain.domain.com",
      "localhost:3000",
    ]);
  });

  it("should parse a single bare hostname", () => {
    expect(parseHostnameList("subdomain.domain.com")).toEqual(["subdomain.domain.com"]);
  });

  it("should tolerate mixed quoting and whitespace", () => {
    expect(parseHostnameList(' "subdomain.domain.com" , localhost:3000 ')).toEqual([
      "subdomain.domain.com",
      "localhost:3000",
    ]);
  });

  it("should drop empty entries", () => {
    expect(parseHostnameList("subdomain.domain.com,")).toEqual(["subdomain.domain.com"]);
  });
});
