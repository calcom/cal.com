import { describe, expect, it } from "vitest";
import { validate } from "./validate";

describe("validate()", () => {
  describe("calLink type validation", () => {
    const calLinkSchema = {
      required: true,
      props: {
        calLink: {
          required: true,
          type: "calLink" as const,
        },
      },
    };

    it("should accept a valid simple calLink (username/event-type)", () => {
      expect(() => validate({ calLink: "john-doe/30min" }, calLinkSchema)).not.toThrow();
    });

    it("should accept a valid team calLink", () => {
      expect(() => validate({ calLink: "team/event-type" }, calLinkSchema)).not.toThrow();
    });

    it("should accept a calLink with query params (false positive regression check)", () => {
      // The old regex /^\/|https?:\/\// would wrongly reject this because it matched `https://` anywhere
      expect(() =>
        validate({ calLink: "team/link?redirect=https://example.com" }, calLinkSchema)
      ).not.toThrow();
    });

    it("should reject a calLink starting with /", () => {
      expect(() => validate({ calLink: "/john-doe/30min" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with http://", () => {
      expect(() => validate({ calLink: "http://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with https://", () => {
      expect(() => validate({ calLink: "https://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with HTTPS:// (case-insensitive check)", () => {
      // The old regex was case-sensitive and would let HTTPS:// bypass the check
      expect(() => validate({ calLink: "HTTPS://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with HTTP:// (case-insensitive check)", () => {
      expect(() => validate({ calLink: "HTTP://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink with ftp:// scheme", () => {
      expect(() => validate({ calLink: "ftp://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink with mailto: scheme", () => {
      expect(() => validate({ calLink: "mailto:john@example.com" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink with javascript: scheme", () => {
      expect(() => validate({ calLink: "javascript:alert(1)" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject an empty string calLink", () => {
      expect(() => validate({ calLink: "" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a whitespace-only calLink", () => {
      expect(() => validate({ calLink: "   " }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should accept a valid calLink with leading and trailing whitespace", () => {
      expect(() => validate({ calLink: "  john-doe/30min  " }, calLinkSchema)).not.toThrow();
    });

    it("should reject a calLink with leading whitespace before a URL", () => {
      expect(() => validate({ calLink: "   https://cal.com/john" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink with leading whitespace before an absolute path", () => {
      expect(() => validate({ calLink: "   /john-doe/30min" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink with a custom URI scheme", () => {
      expect(() => validate({ calLink: "vscode://extension" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with a backslash", () => {
      expect(() => validate({ calLink: "\\john-doe/30min" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });

    it("should reject a calLink starting with double backslashes", () => {
      expect(() => validate({ calLink: "\\\\evil.com" }, calLinkSchema)).toThrow(
        '"calLink" is of wrong type.Expected type "calLink"'
      );
    });
  });

  describe("required field validation", () => {
    it("should throw when a required prop is missing", () => {
      const schema = {
        required: true,
        props: {
          calLink: {
            required: true,
            type: "calLink" as const,
          },
        },
      };
      expect(() => validate({}, schema)).toThrow('"calLink" is required');
    });

    it("should not throw when an optional prop is missing", () => {
      const schema = {
        required: true,
        props: {
          calLink: {
            required: true,
            type: "calLink" as const,
          },
          config: {
            required: false,
            type: Object,
          },
        },
      };
      expect(() => validate({ calLink: "john/30min" }, schema)).not.toThrow();
    });
  });

  describe("string type validation", () => {
    const stringSchema = {
      required: true,
      props: {
        theme: {
          required: false,
          type: "string" as const,
        },
      },
    };

    it("should accept a valid string", () => {
      expect(() => validate({ theme: "dark" }, stringSchema)).not.toThrow();
    });

    it("should reject a non-string value", () => {
      expect(() => validate({ theme: 123 }, stringSchema)).toThrow(
        '"theme" is of wrong type.Expected type "string"'
      );
    });
  });

  describe("union type (array) validation", () => {
    const unionSchema = {
      required: true,
      props: {
        value: {
          required: true,
          type: ["string", "function"] as const,
        },
      },
    };

    it("should accept a value matching the first type in the union", () => {
      expect(() => validate({ value: "test string" }, unionSchema)).not.toThrow();
    });

    it("should accept a value matching the second type in the union", () => {
      expect(() => validate({ value: () => {} }, unionSchema)).not.toThrow();
    });

    it("should reject a value that matches neither type in the union", () => {
      expect(() => validate({ value: 123 }, unionSchema)).toThrow(
        '"value" is of wrong type.Expected type "string,function"'
      );
    });
  });
});
