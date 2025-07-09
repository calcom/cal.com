import type { ReadonlyURLSearchParams } from "next/navigation";
import { describe, expect, it } from "vitest";

import { EmbedTheme } from "@calcom/features/embed/lib/constants";

import { getThemeProviderProps } from "../getThemeProviderProps";
import { getUniqueIdentifierForBookingPage } from "../getThemeProviderProps";

describe("getThemeProviderProps", () => {
  const fnArg = {
    props: {
      isBookingPage: false,
      isThemeSupported: true,
      nonce: "test-nonce",
    },
    isEmbedMode: false,
    embedNamespace: null,
    searchParams: new URLSearchParams() as unknown as ReadonlyURLSearchParams,
  };

  describe("App Theme Support", () => {
    const expectedStorageKey = "app-theme";
    const appThemeExpectedProps = {
      attribute: "class",
      storageKey: expectedStorageKey,
      key: expectedStorageKey,
      nonce: "test-nonce",
      enableColorScheme: false,
    };

    it("should return app theme configuration when not in booking page or embed mode", () => {
      const result = getThemeProviderProps({
        ...fnArg,
        pathname: "/test",
      });
      expect(result).toEqual({
        forcedTheme: undefined,
        enableSystem: true,
        ...appThemeExpectedProps,
      });
    });

    it("should force light theme and no storageKey and system theme support is required when isThemeSupported is false", () => {
      const result = getThemeProviderProps({
        ...fnArg,
        pathname: "/test",
        props: {
          ...fnArg.props,
          isThemeSupported: false,
        },
      });

      expect(result).toEqual({
        ...appThemeExpectedProps,
        storageKey: "forcedThemeKey",
        key: "forcedThemeKey",
        forcedTheme: "light",
        enableSystem: false,
      });
    });

    it("should not force theme when isThemeSupported is not explicitly set", () => {
      const result = getThemeProviderProps({
        ...fnArg,
        pathname: "/test",
        props: {
          ...fnArg.props,
          isThemeSupported: undefined,
        },
      });

      expect(result).toEqual({
        ...appThemeExpectedProps,
        forcedTheme: undefined,
        enableSystem: true,
      });
    });
  });

  describe("Booking Page Theme Support", () => {
    const bookingPageExpectedProps = {
      attribute: "class",
      nonce: "test-nonce",
      enableColorScheme: false,
    };

    it("should handle booking page theme", () => {
      const expectedStorageKey = "booking-theme:free";

      const result = getThemeProviderProps({
        ...fnArg,
        pathname: "/free/30min",
        props: {
          ...fnArg.props,
          isBookingPage: true,
        },
      });

      expect(result).toEqual({
        ...bookingPageExpectedProps,
        storageKey: expectedStorageKey,
        key: expectedStorageKey,
        forcedTheme: undefined,
        enableSystem: true,
      });
    });

    it("should handle team booking page theme configuration", () => {
      const result = getThemeProviderProps({
        ...fnArg,
        props: {
          ...fnArg.props,
          isBookingPage: true,
        },
        pathname: "/team/sales/30min",
      });

      expect(result.storageKey).toBe("booking-theme:sales");
    });
  });

  describe("Embed Mode Theme Support", () => {
    const embedProps = {
      ...fnArg,
      isEmbedMode: true,
    };

    const embedPageExpectedProps = {
      attribute: "class",
      nonce: "test-nonce",
      enableColorScheme: false,
      enableSystem: true,
      forcedTheme: undefined,
    };

    it("should handle embed mode with default theme", () => {
      const result = getThemeProviderProps({
        ...embedProps,
        embedNamespace: "ns",
        pathname: "/free",
      });
      const storageKey = "embed-theme-ns:free";
      expect(result).toEqual({
        ...embedPageExpectedProps,
        storageKey,
        key: storageKey,
      });
    });

    it("should handle embed mode with explicit theme. Must have theme name in storageKey so that different themes for different booking pages under same namespace also work", () => {
      const searchParams = new URLSearchParams();
      searchParams.set("theme", EmbedTheme.dark);
      const result = getThemeProviderProps({
        ...embedProps,
        searchParams: searchParams as unknown as ReadonlyURLSearchParams,
        pathname: "/free",
        embedNamespace: "ns",
      });

      const expectedStorageKey = "embed-theme-ns:free:dark";

      expect(result).toEqual({
        ...embedPageExpectedProps,
        storageKey: expectedStorageKey,
        key: expectedStorageKey,
      });
    });

    it("should not append theme suffix for auto theme as that is kind of default", () => {
      const searchParams = new URLSearchParams();
      searchParams.set("theme", EmbedTheme.auto);

      const result = getThemeProviderProps({
        ...embedProps,
        searchParams: searchParams as unknown as ReadonlyURLSearchParams,
        pathname: "/free",
        embedNamespace: "ns",
      });

      expect(result).toEqual({
        ...embedPageExpectedProps,
        storageKey: "embed-theme-ns:free",
        key: "embed-theme-ns:free",
      });
    });
  });
});

describe("getUniqueIdentifierForBookingPage", () => {
  describe("User Pages", () => {
    it.each([
      { path: "/test", expected: "test" },
      { path: "/test/anything", expected: "test" },
    ])("should return $expected for $path", ({ path, expected }) => {
      const result = getUniqueIdentifierForBookingPage({ pathname: path });
      expect(result).toBe(expected);
    });

    it("should return / for root path", () => {
      const result = getUniqueIdentifierForBookingPage({ pathname: "/" });
      expect(result).toBe("/");
    });
  });

  describe("Team Pages", () => {
    it.each([
      { path: "/team/test", expected: "test" },
      { path: "/team/test/anything", expected: "test" },
    ])("should return $expected for $path", ({ path, expected }) => {
      const result = getUniqueIdentifierForBookingPage({ pathname: path });
      expect(result).toBe(expected);
    });
  });

  describe("Routing Pages", () => {
    it("should return formId for routing pages", () => {
      const result = getUniqueIdentifierForBookingPage({
        pathname: "/forms/test",
      });
      expect(result).toBe("test");
    });
  });

  describe("Private Booking Pages", () => {
    it.each([
      { path: "/d/private", expected: "private" },
      { path: "/d/private/anything", expected: "private" },
    ])("should return $expected for $path", ({ path, expected }) => {
      const result = getUniqueIdentifierForBookingPage({ pathname: path });
      expect(result).toBe(expected);
    });
  });

  describe("Dynamic Booking Pages", () => {
    it.each([
      { path: "/john+jane", expected: "john+jane" },
      { path: "/john+jane/", expected: "john+jane" },
      { path: "/john+jane/anything", expected: "john+jane" },
      { path: "/john%2bjane/anything", expected: "john%2bjane" },
    ])("should return $expected for $path", ({ path, expected }) => {
      const result = getUniqueIdentifierForBookingPage({ pathname: path });
      expect(result).toBe(expected);
    });
  });
});
