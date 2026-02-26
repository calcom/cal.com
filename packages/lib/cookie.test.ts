// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getCookie, setCookie } from "./cookie";

describe("getCookie", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  it("returns cookie value by name", () => {
    document.cookie = "testCookie=testValue";
    expect(getCookie("testCookie")).toBe("testValue");
  });

  it("returns undefined when cookie not found", () => {
    document.cookie = "other=value";
    expect(getCookie("missing")).toBeUndefined();
  });

  it("handles multiple cookies", () => {
    document.cookie = "first=1";
    document.cookie = "second=2";
    document.cookie = "third=3";
    expect(getCookie("second")).toBe("2");
  });
});

describe("setCookie", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  it("sets cookie string on document", () => {
    setCookie("myCookie", "myValue", "path=/");
    expect(document.cookie).toContain("myCookie=myValue");
  });

  it("sets cookie with options", () => {
    setCookie("session", "abc123", "path=/; SameSite=Lax");
    expect(document.cookie).toContain("session=abc123");
  });
});
