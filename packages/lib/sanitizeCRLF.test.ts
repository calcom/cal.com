import { describe, expect, it } from "vitest";
import { stripCRLF } from "./sanitizeCRLF";

describe("stripCRLF", () => {
  it("removes carriage return characters", () => {
    expect(stripCRLF("hello\rworld")).toBe("helloworld");
  });

  it("removes newline characters", () => {
    expect(stripCRLF("hello\nworld")).toBe("helloworld");
  });

  it("removes CRLF sequences", () => {
    expect(stripCRLF("hello\r\nworld")).toBe("helloworld");
  });

  it("removes multiple occurrences", () => {
    expect(stripCRLF("a\rb\nc\r\nd")).toBe("abcd");
  });

  it("returns the same string when no CRLF present", () => {
    expect(stripCRLF("noreply@org.com")).toBe("noreply@org.com");
  });

  it("handles empty string", () => {
    expect(stripCRLF("")).toBe("");
  });

  it("strips injected SMTP header from email", () => {
    expect(stripCRLF("noreply@org.com\r\nBcc: attacker@evil.com")).toBe(
      "noreply@org.comBcc: attacker@evil.com"
    );
  });

  it("strips injected SMTP header from host", () => {
    expect(stripCRLF("smtp.org.com\r\nX-Injected: true")).toBe("smtp.org.comX-Injected: true");
  });
});
