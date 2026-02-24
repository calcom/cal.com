import { afterEach, describe, expect, it, vi } from "vitest";
import { localStorage, sessionStorage } from "./webstorage";

describe("localStorage wrapper", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("getItem returns stored value", () => {
    window.localStorage.setItem("key", "value");
    expect(localStorage.getItem("key")).toBe("value");
  });

  it("getItem returns null for missing key", () => {
    expect(localStorage.getItem("missing")).toBeNull();
  });

  it("getItem returns null when storage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("restricted");
    });
    expect(localStorage.getItem("key")).toBeNull();
    vi.restoreAllMocks();
  });

  it("setItem stores a value", () => {
    localStorage.setItem("key", "value");
    expect(window.localStorage.getItem("key")).toBe("value");
  });

  it("setItem swallows errors when storage throws", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => localStorage.setItem("key", "value")).not.toThrow();
    vi.restoreAllMocks();
  });

  it("removeItem removes a value", () => {
    window.localStorage.setItem("key", "value");
    localStorage.removeItem("key");
    expect(window.localStorage.getItem("key")).toBeNull();
  });

  it("removeItem swallows errors when storage throws", () => {
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new Error("restricted");
    });
    expect(() => localStorage.removeItem("key")).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("sessionStorage wrapper", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("getItem returns stored value", () => {
    window.sessionStorage.setItem("key", "value");
    expect(sessionStorage.getItem("key")).toBe("value");
  });

  it("getItem returns null for missing key", () => {
    expect(sessionStorage.getItem("missing")).toBeNull();
  });

  it("getItem returns null when storage throws", () => {
    vi.spyOn(window.sessionStorage, "getItem").mockImplementation(() => {
      throw new Error("restricted");
    });
    expect(sessionStorage.getItem("key")).toBeNull();
    vi.restoreAllMocks();
  });

  it("setItem stores a value", () => {
    sessionStorage.setItem("key", "value");
    expect(window.sessionStorage.getItem("key")).toBe("value");
  });

  it("setItem swallows errors when storage throws", () => {
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => sessionStorage.setItem("key", "value")).not.toThrow();
    vi.restoreAllMocks();
  });

  it("removeItem removes a value", () => {
    window.sessionStorage.setItem("key", "value");
    sessionStorage.removeItem("key");
    expect(window.sessionStorage.getItem("key")).toBeNull();
  });

  it("removeItem swallows errors when storage throws", () => {
    vi.spyOn(window.sessionStorage, "removeItem").mockImplementation(() => {
      throw new Error("restricted");
    });
    expect(() => sessionStorage.removeItem("key")).not.toThrow();
    vi.restoreAllMocks();
  });
});
