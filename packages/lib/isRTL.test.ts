import { describe, expect, it } from "vitest";
import { 
  isRTLLanguage, 
  getTextDirection, 
  rtlClassNames, 
  directionalClasses, 
  rtlTransform,
  RTL_LANGUAGES 
} from "./isRTL";

describe("isRTL utilities", () => {
  describe("isRTLLanguage", () => {
    it("should return true for RTL languages", () => {
      expect(isRTLLanguage("ar")).toBe(true);
      expect(isRTLLanguage("he")).toBe(true);
      expect(isRTLLanguage("iw")).toBe(true);
      expect(isRTLLanguage("fa")).toBe(true);
      expect(isRTLLanguage("ur")).toBe(true);
    });

    it("should return false for LTR languages", () => {
      expect(isRTLLanguage("en")).toBe(false);
      expect(isRTLLanguage("fr")).toBe(false);
      expect(isRTLLanguage("de")).toBe(false);
      expect(isRTLLanguage("es")).toBe(false);
    });

    it("should handle locale codes with regions", () => {
      expect(isRTLLanguage("ar-SA")).toBe(true);
      expect(isRTLLanguage("ar-EG")).toBe(true);
      expect(isRTLLanguage("he-IL")).toBe(true);
      expect(isRTLLanguage("en-US")).toBe(false);
      expect(isRTLLanguage("fr-FR")).toBe(false);
    });

    it("should handle empty or invalid input", () => {
      expect(isRTLLanguage("")).toBe(false);
      expect(isRTLLanguage(null as any)).toBe(false);
      expect(isRTLLanguage(undefined as any)).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isRTLLanguage("AR")).toBe(true);
      expect(isRTLLanguage("He")).toBe(true);
      expect(isRTLLanguage("EN")).toBe(false);
    });
  });

  describe("getTextDirection", () => {
    it("should return 'rtl' for RTL languages", () => {
      expect(getTextDirection("ar")).toBe("rtl");
      expect(getTextDirection("he")).toBe("rtl");
      expect(getTextDirection("fa")).toBe("rtl");
      expect(getTextDirection("ur")).toBe("rtl");
    });

    it("should return 'ltr' for LTR languages", () => {
      expect(getTextDirection("en")).toBe("ltr");
      expect(getTextDirection("fr")).toBe("ltr");
      expect(getTextDirection("de")).toBe("ltr");
    });

    it("should handle locale codes with regions", () => {
      expect(getTextDirection("ar-SA")).toBe("rtl");
      expect(getTextDirection("en-US")).toBe("ltr");
    });

    it("should default to ltr for invalid input", () => {
      expect(getTextDirection("")).toBe("ltr");
      expect(getTextDirection(null as any)).toBe("ltr");
      expect(getTextDirection(undefined as any)).toBe("ltr");
    });
  });

  describe("rtlClassNames", () => {
    it("should return base classes for LTR", () => {
      expect(rtlClassNames("en", "base-class", "rtl-class")).toBe("base-class");
      expect(rtlClassNames("fr", "flex justify-center", "rtl-specific")).toBe("flex justify-center");
    });

    it("should append RTL classes for RTL languages", () => {
      expect(rtlClassNames("ar", "base-class", "rtl-class")).toBe("base-class rtl-class");
      expect(rtlClassNames("he", "flex items-center", "rtl:flex-row-reverse")).toBe("flex items-center rtl:flex-row-reverse");
    });

    it("should handle missing RTL classes", () => {
      expect(rtlClassNames("ar", "base-class")).toBe("base-class");
      expect(rtlClassNames("ar", "base-class", "")).toBe("base-class");
    });

    it("should handle empty base classes", () => {
      expect(rtlClassNames("ar", "", "rtl-class")).toBe(" rtl-class");
      expect(rtlClassNames("en", "", "rtl-class")).toBe("");
    });
  });

  describe("directionalClasses", () => {
    it("should return LTR classes for LTR languages", () => {
      expect(directionalClasses("en", "ml-4 mr-2")).toBe("ml-4 mr-2");
      expect(directionalClasses("fr", "pl-3 pr-1 text-left")).toBe("pl-3 pr-1 text-left");
    });

    it("should auto-swap margin classes for RTL languages", () => {
      expect(directionalClasses("ar", "ml-4 mr-2")).toBe("mr-4 ml-2");
      expect(directionalClasses("he", "ml-0 mr-auto")).toBe("mr-0 ml-auto");
    });

    it("should auto-swap padding classes for RTL languages", () => {
      expect(directionalClasses("ar", "pl-3 pr-1")).toBe("pr-3 pl-1");
      expect(directionalClasses("he", "pl-0 pr-4")).toBe("pr-0 pl-4");
    });

    it("should auto-swap text alignment for RTL languages", () => {
      expect(directionalClasses("ar", "text-left")).toBe("text-right");
      expect(directionalClasses("ar", "text-right")).toBe("text-left");
      expect(directionalClasses("ar", "text-center")).toBe("text-center");
    });

    it("should auto-swap border classes for RTL languages", () => {
      expect(directionalClasses("ar", "border-l border-r-2")).toBe("border-r border-l-2");
      expect(directionalClasses("he", "border-l-0 border-r-4")).toBe("border-r-0 border-l-4");
    });

    it("should auto-swap rounded classes for RTL languages", () => {
      expect(directionalClasses("ar", "rounded-l rounded-r-lg")).toBe("rounded-r rounded-l-lg");
      expect(directionalClasses("he", "rounded-tl rounded-br")).toBe("rounded-tr rounded-bl");
    });

    it("should use explicit RTL classes when provided", () => {
      expect(directionalClasses("ar", "ml-4", "custom-rtl")).toBe("custom-rtl");
      expect(directionalClasses("he", "text-left", "text-right")).toBe("text-right");
    });

    it("should handle complex class combinations", () => {
      const ltrClasses = "ml-4 mr-2 pl-3 pr-1 text-left border-l-2 rounded-tl";
      const expected = "mr-4 ml-2 pr-3 pl-1 text-right border-r-2 rounded-tr";
      expect(directionalClasses("ar", ltrClasses)).toBe(expected);
    });

    it("should preserve non-directional classes", () => {
      expect(directionalClasses("ar", "flex items-center ml-4 bg-blue-500")).toBe("flex items-center mr-4 bg-blue-500");
    });
  });

  describe("rtlTransform", () => {
    it("should return empty string for LTR", () => {
      expect(rtlTransform("en", true)).toBe("");
      expect(rtlTransform("fr", true)).toBe("");
    });

    it("should return mirror transform for RTL when enabled", () => {
      expect(rtlTransform("ar", true)).toBe("scale-x-[-1]");
      expect(rtlTransform("he", true)).toBe("scale-x-[-1]");
    });

    it("should return empty string for RTL when mirroring disabled", () => {
      expect(rtlTransform("ar", false)).toBe("");
      expect(rtlTransform("he", false)).toBe("");
    });

    it("should default to no mirroring when mirror parameter not provided", () => {
      expect(rtlTransform("ar")).toBe("");
    });
  });

  describe("RTL_LANGUAGES constant", () => {
    it("should contain expected RTL languages", () => {
      expect(RTL_LANGUAGES).toContain("ar");
      expect(RTL_LANGUAGES).toContain("he");
      expect(RTL_LANGUAGES).toContain("iw");
      expect(RTL_LANGUAGES).toContain("fa");
      expect(RTL_LANGUAGES).toContain("ur");
    });

    it("should not contain LTR languages", () => {
      expect(RTL_LANGUAGES).not.toContain("en");
      expect(RTL_LANGUAGES).not.toContain("fr");
      expect(RTL_LANGUAGES).not.toContain("de");
    });
  });
});