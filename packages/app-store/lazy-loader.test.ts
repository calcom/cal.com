import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadApp, hasApp, getAvailableApps, clearAppCache, lazyAppStore } from "./lazy-loader";
import * as lazyLoaderModule from "./lazy-loader";

// Mock the dynamic imports to avoid actual module loading during tests
vi.mock("./stripepayment", () => ({
  metadata: { name: "Stripe", slug: "stripepayment" },
  api: {},
  lib: {},
}));

vi.mock("./googlevideo", () => ({
  metadata: { name: "Google Meet", slug: "googlevideo" },
  api: {},
  lib: {},
}));

describe("lazy-loader", () => {
  beforeEach(() => {
    clearAppCache();
  });

  describe("loadApp", () => {
    it("should load an existing app", async () => {
      const app = await loadApp("stripepayment");
      expect(app).toBeDefined();
      expect(app?.metadata?.name).toBe("Stripe");
    });

    it("should return null for non-existent app", async () => {
      const app = await loadApp("does-not-exist");
      expect(app).toBeNull();
    });

    it("should cache loaded apps", async () => {
      const app1 = await loadApp("stripepayment");
      const app2 = await loadApp("stripepayment");
      expect(app1).toBe(app2); // Same reference due to caching
    });
  });

  describe("hasApp", () => {
    it("should return true for existing apps", () => {
      expect(hasApp("stripepayment")).toBe(true);
      expect(hasApp("googlevideo")).toBe(true);
    });

    it("should return false for non-existent apps", () => {
      expect(hasApp("does-not-exist")).toBe(false);
      expect(hasApp("typo-app")).toBe(false);
    });
  });

  describe("getAvailableApps", () => {
    it("should return array of available app names", () => {
      const apps = getAvailableApps();
      expect(Array.isArray(apps)).toBe(true);
      expect(apps.length).toBeGreaterThan(0);
      expect(apps).toContain("stripepayment");
      expect(apps).toContain("googlevideo");
    });
  });

  describe("lazyAppStore compatibility proxy", () => {
    it("should return a function for existing apps", () => {
      const loader = lazyAppStore["stripepayment"];
      expect(typeof loader).toBe("function");
    });

    it("should return undefined for non-existent apps", () => {
      const loader = lazyAppStore["does-not-exist"];
      expect(loader).toBeUndefined();
    });

    it("should return undefined for typos", () => {
      const loader = lazyAppStore["stripepaymen"]; // typo
      expect(loader).toBeUndefined();
    });

    it("should not invoke any loader for non-existent apps with optional chaining", () => {
      const loadAppSpy = vi.spyOn(lazyLoaderModule, "loadApp");

      // This should not call loadApp since the property is undefined
      const result = lazyAppStore["does-not-exist"]?.();

      expect(result).toBeUndefined();
      expect(loadAppSpy).not.toHaveBeenCalled();

      loadAppSpy.mockRestore();
    });

    it("should load app when calling existing app loader", async () => {
      const loader = lazyAppStore["stripepayment"];
      expect(typeof loader).toBe("function");

      const app = await loader();
      expect(app).toBeDefined();
      expect(app?.metadata?.name).toBe("Stripe");
    });

    it("should support 'in' operator correctly", () => {
      expect("stripepayment" in lazyAppStore).toBe(true);
      expect("does-not-exist" in lazyAppStore).toBe(false);
    });

    it("should support Object.keys() correctly", () => {
      const keys = Object.keys(lazyAppStore);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toContain("stripepayment");
      expect(keys).not.toContain("does-not-exist");
    });
  });

  describe("clearAppCache", () => {
    it("should clear the app cache", async () => {
      // Load an app to cache it
      const app1 = await loadApp("stripepayment");
      expect(app1).toBeDefined();

      // Clear cache
      clearAppCache();

      // Load again - should be a fresh instance (though content will be same due to module caching)
      const app2 = await loadApp("stripepayment");
      expect(app2).toBeDefined();
      expect(app2?.metadata?.name).toBe("Stripe");
    });
  });
});
