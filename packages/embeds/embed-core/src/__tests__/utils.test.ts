import { describe, expect, it } from "vitest";

import { generateDataAttributes, isSameBookingLink, mergeUiConfig } from "../lib/utils";
import type { UiConfig } from "../types";

describe("generateDataAttributes", () => {
  it("should handle PascalCase property names correctly", () => {
    const props = {
      TestKey: "testValue",
      AnotherKey: "anotherValue",
    };

    expect(generateDataAttributes(props)).toBe('data-test-key="testValue" data-another-key="anotherValue"');
  });

  it("should handle camelCase property names correctly", () => {
    const props = {
      camelCaseKey: "value",
      superLongCamelCaseKey: "test",
    };

    expect(generateDataAttributes(props)).toBe(
      'data-camel-case-key="value" data-super-long-camel-case-key="test"'
    );
  });

  it("should filter out null and undefined values", () => {
    const props = {
      validKey: "value",
      nullKey: null,
      undefinedKey: undefined,
    };

    expect(generateDataAttributes(props)).toBe('data-valid-key="value"');
  });

  it("should return empty string for empty object", () => {
    const props = {};

    expect(generateDataAttributes(props)).toBe("");
  });

  it("should handle object with all null/undefined values", () => {
    const props = {
      key1: null,
      key2: undefined,
    };

    expect(generateDataAttributes(props)).toBe("");
  });

  it("should escape special characters in attribute values", () => {
    const props = {
      testKey: "<script>alert('XSS')</script>",
      testKey2: '<script>alert("XSS")</script>',
    };

    expect(generateDataAttributes(props)).toBe(
      'data-test-key="&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;" data-test-key2="&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"'
    );
  });
});

describe("isSameBookingLink", () => {
  it("should return true for same booking link", () => {
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/event-booking-url",
        bookingLinkPath2: "/team/event-booking-url",
      })
    ).toBe(true);
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/team1/event-booking-url",
        bookingLinkPath2: "/team/team1/event-booking-url",
      })
    ).toBe(true);
  });

  it("should return false for different booking links", () => {
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team/event-booking-url",
        bookingLinkPath2: "/team/event-booking-url-2",
      })
    ).toBe(false);
  });

  it("should return true for same booking links with /team prefix in them", () => {
    expect(isSameBookingLink({ bookingLinkPath1: "/team/sales/demo", bookingLinkPath2: "/sales/demo" })).toBe(
      true
    );
    expect(
      isSameBookingLink({
        bookingLinkPath1: "/team1/event-booking-url",
        bookingLinkPath2: "/team/team1/event-booking-url",
      })
    ).toBe(true);
  });
});

describe("mergeUiConfig", () => {
  it("should merge cssVarsPerTheme at theme level when themes are set in different calls", () => {
    const oldConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red", "--cal-text": "black" },
      } as UiConfig["cssVarsPerTheme"],
    };

    const newConfig: UiConfig = {
      cssVarsPerTheme: {
        dark: { "--cal-brand": "blue", "--cal-text": "white" },
      } as UiConfig["cssVarsPerTheme"],
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: { "--cal-brand": "red", "--cal-text": "black" },
      dark: { "--cal-brand": "blue", "--cal-text": "white" },
    });
  });

  it("should merge CSS vars within the same theme", () => {
    const oldConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red", "--cal-text": "black" },
      } as unknown as UiConfig["cssVarsPerTheme"],
    };

    const newConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "blue", "--cal-spacing": "8px" },
      } as unknown as UiConfig["cssVarsPerTheme"],
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: {
        "--cal-brand": "blue", // new value overrides old
        "--cal-text": "black", // old value preserved
        "--cal-spacing": "8px", // new value added
      },
    });
  });

  it("should handle missing old cssVarsPerTheme", () => {
    const oldConfig: UiConfig = {
      theme: "light",
    };

    const newConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red" },
        dark: { "--cal-brand": "blue" },
      } as UiConfig["cssVarsPerTheme"],
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: { "--cal-brand": "red" },
      dark: { "--cal-brand": "blue" },
    });
    expect(merged.theme).toBe("light");
  });

  it("should handle missing new cssVarsPerTheme", () => {
    const oldConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red" },
      } as unknown as UiConfig["cssVarsPerTheme"],
    };

    const newConfig: UiConfig = {
      theme: "dark",
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: { "--cal-brand": "red" },
    });
    expect(merged.theme).toBe("dark");
  });

  it("should preserve other UiConfig properties", () => {
    const oldConfig: UiConfig = {
      theme: "light",
      layout: "month_view",
      hideEventTypeDetails: true,
    };

    const newConfig: UiConfig = {
      theme: "dark",
      colorScheme: "dark",
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.theme).toBe("dark"); // new value overrides
    expect(merged.layout).toBe("month_view"); // old value preserved
    expect(merged.hideEventTypeDetails).toBe(true); // old value preserved
    expect(merged.colorScheme).toBe("dark"); // new value added
  });

  it("should handle empty configs", () => {
    const oldConfig: UiConfig = {};
    const newConfig: UiConfig = {};

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged).toEqual({});
    expect(merged.cssVarsPerTheme).toBeUndefined();
  });

  it("should handle when both configs have cssVarsPerTheme with overlapping themes", () => {
    const oldConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red", "--cal-text": "black" },
        dark: { "--cal-brand": "dark-red" },
      } as UiConfig["cssVarsPerTheme"],
    };

    const newConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "blue" },
        dark: { "--cal-text": "white" },
      } as UiConfig["cssVarsPerTheme"],
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: {
        "--cal-brand": "blue", // new overrides old
        "--cal-text": "black", // old preserved
      },
      dark: {
        "--cal-brand": "dark-red", // old preserved
        "--cal-text": "white", // new added
      },
    });
  });

  it("should handle null/undefined cssVarsPerTheme gracefully", () => {
    const oldConfig: UiConfig = {
      cssVarsPerTheme: {
        light: { "--cal-brand": "red" },
      } as unknown as UiConfig["cssVarsPerTheme"],
    };

    const newConfig: UiConfig = {
      cssVarsPerTheme: undefined,
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged.cssVarsPerTheme).toEqual({
      light: { "--cal-brand": "red" },
    });
  });

  it("should merge complex scenarios with multiple properties", () => {
    const oldConfig: UiConfig = {
      theme: "light",
      layout: "month_view",
      cssVarsPerTheme: {
        light: { "--cal-brand": "red" },
      } as unknown as UiConfig["cssVarsPerTheme"],
      disableAutoScroll: true,
    };

    const newConfig: UiConfig = {
      theme: "dark",
      cssVarsPerTheme: {
        dark: { "--cal-brand": "blue" },
        light: { "--cal-spacing": "16px" },
      } as unknown as UiConfig["cssVarsPerTheme"],
      useSlotsViewOnSmallScreen: true,
    };

    const merged = mergeUiConfig(oldConfig, newConfig);

    expect(merged).toEqual({
      theme: "dark",
      layout: "month_view",
      cssVarsPerTheme: {
        light: {
          "--cal-brand": "red",
          "--cal-spacing": "16px",
        },
        dark: {
          "--cal-brand": "blue",
        },
      },
      disableAutoScroll: true,
      useSlotsViewOnSmallScreen: true,
    });
  });
});
