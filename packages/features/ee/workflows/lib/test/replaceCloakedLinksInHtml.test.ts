import { describe, expect, test } from "vitest";

import { replaceCloakedLinksInHtml } from "../reminders/utils";

describe("replaceCloakedLinksInHtml", () => {
  describe("basic cloaked links", () => {
    test("should replace cloaked link text with the actual URL", () => {
      const html = '<a href="https://example.com">Click here</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should replace cloaked link with different text", () => {
      const html = '<a href="https://malicious-site.com">Visit our safe website</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://malicious-site.com">https://malicious-site.com</a>');
    });

    test("should handle links with additional attributes", () => {
      const html = '<a href="https://example.com" target="_blank" rel="noopener">Click here</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com" target="_blank" rel="noopener">https://example.com</a>');
    });
  });

  describe("nested HTML tags", () => {
    test("should handle bold text inside link", () => {
      const html = '<a href="https://example.com"><b>Click here</b></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should handle strong text inside link", () => {
      const html = '<a href="https://example.com"><strong>Click here</strong></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should handle span inside link", () => {
      const html = '<a href="https://example.com"><span class="link-text">Click here</span></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should handle multiple nested tags", () => {
      const html = '<a href="https://example.com"><span><strong>Click here</strong></span></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should handle nested tags with visible URL - should remain unchanged", () => {
      const html = '<a href="https://example.com"><strong>https://example.com</strong></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com"><strong>https://example.com</strong></a>');
    });
  });

  describe("already-visible URLs", () => {
    test("should not modify link when text matches URL exactly", () => {
      const html = '<a href="https://example.com">https://example.com</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should not modify link when text matches URL without protocol", () => {
      const html = '<a href="https://example.com">example.com</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">example.com</a>');
    });

    test("should not modify link when text matches URL with trailing slash difference", () => {
      const html = '<a href="https://example.com/">https://example.com</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com/">https://example.com</a>');
    });

    test("should handle case-insensitive URL comparison", () => {
      const html = '<a href="https://Example.COM">https://example.com</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://Example.COM">https://example.com</a>');
    });
  });

  describe("empty link text", () => {
    test("should replace empty link text with URL", () => {
      const html = '<a href="https://example.com"></a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should replace whitespace-only link text with URL", () => {
      const html = '<a href="https://example.com">   </a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });
  });

  describe("multiple links in content", () => {
    test("should replace all cloaked links in content", () => {
      const html =
        '<p>Visit <a href="https://site1.com">here</a> and <a href="https://site2.com">there</a></p>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe(
        '<p>Visit <a href="https://site1.com">https://site1.com</a> and <a href="https://site2.com">https://site2.com</a></p>'
      );
    });

    test("should handle mix of cloaked and visible links", () => {
      const html =
        '<p><a href="https://visible.com">https://visible.com</a> and <a href="https://hidden.com">Click me</a></p>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe(
        '<p><a href="https://visible.com">https://visible.com</a> and <a href="https://hidden.com">https://hidden.com</a></p>'
      );
    });

    test("should handle multiple nested HTML links", () => {
      const html =
        '<div><a href="https://a.com"><b>Link A</b></a><a href="https://b.com"><i>Link B</i></a></div>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe(
        '<div><a href="https://a.com">https://a.com</a><a href="https://b.com">https://b.com</a></div>'
      );
    });
  });

  describe("edge cases", () => {
    test("should handle links with single quotes in href", () => {
      const html = "<a href='https://example.com'>Click here</a>";
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe("<a href='https://example.com'>https://example.com</a>");
    });

    test("should handle multiline link content", () => {
      const html = `<a href="https://example.com">
        Click
        here
      </a>`;
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    test("should preserve surrounding content", () => {
      const html = '<p>Before</p><a href="https://example.com">Link</a><p>After</p>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<p>Before</p><a href="https://example.com">https://example.com</a><p>After</p>');
    });

    test("should handle content with no links", () => {
      const html = "<p>No links here</p>";
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe("<p>No links here</p>");
    });

    test("should handle empty string", () => {
      const html = "";
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe("");
    });

    test("should escape HTML special characters in href to prevent XSS", () => {
      // Test case for potential XSS vector where href contains HTML special characters
      const html = '<a href="https://example.com?foo=1&bar=2">Click here</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe('<a href="https://example.com?foo=1&bar=2">https://example.com?foo=1&amp;bar=2</a>');
    });

    test("should escape angle brackets in href", () => {
      const html = '<a href="https://example.com/<script>alert(1)</script>">Click here</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe(
        '<a href="https://example.com/<script>alert(1)</script>">https://example.com/&lt;script&gt;alert(1)&lt;/script&gt;</a>'
      );
    });

    test("should escape quotes in href", () => {
      const html = '<a href="https://example.com?q=&quot;test&quot;">Click here</a>';
      const result = replaceCloakedLinksInHtml(html);
      expect(result).toBe(
        '<a href="https://example.com?q=&quot;test&quot;">https://example.com?q=&amp;quot;test&amp;quot;</a>'
      );
    });
  });
});
