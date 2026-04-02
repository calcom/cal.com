import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getScrollableAncestor } from "./domUtils";

function createMockElement(options: {
  scrollHeight?: number;
  clientHeight?: number;
  overflowY?: string;
  overflow?: string;
  parentElement?: HTMLElement | null;
}): HTMLElement {
  const element = document.createElement("div");

  // Set up scroll properties
  Object.defineProperty(element, "scrollHeight", {
    value: options.scrollHeight ?? 100,
    writable: true,
  });

  Object.defineProperty(element, "clientHeight", {
    value: options.clientHeight ?? 100,
    writable: true,
  });

  // Set up parent relationship
  if (options.parentElement !== undefined) {
    Object.defineProperty(element, "parentElement", {
      value: options.parentElement,
      writable: true,
    });
  }

  return element;
}

function mockGetComputedStyle(styleOverrides: Record<string, Record<string, string>> = {}) {
  return vi.fn().mockImplementation((element: HTMLElement) => {
    const elementKey = element.tagName + (element.id ? `#${element.id}` : "");
    const styles = styleOverrides[elementKey] || {};

    return {
      getPropertyValue: vi.fn().mockImplementation((property: string) => {
        return styles[property] || "visible";
      }),
    };
  });
}

describe("getScrollableAncestor", () => {
  let originalGetComputedStyle: typeof window.getComputedStyle;
  let originalDocumentElement: Document["documentElement"];
  let originalScrollingElement: Document["scrollingElement"];

  beforeAll(() => {
    originalGetComputedStyle = window.getComputedStyle;
    originalDocumentElement = document.documentElement;
    originalScrollingElement = document.scrollingElement;
  });

  beforeEach(() => {
    // Reset document.scrollingElement to a default mock
    Object.defineProperty(document, "scrollingElement", {
      value: document.createElement("html"),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
    Object.defineProperty(document, "documentElement", {
      value: originalDocumentElement,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "scrollingElement", {
      value: originalScrollingElement,
      writable: true,
      configurable: true,
    });
  });

  describe("with scrollable ancestors", () => {
    it("should return the first scrollable ancestor with overflow-y: auto", () => {
      const scrollableParent = createMockElement({
        scrollHeight: 200,
        clientHeight: 100,
      });
      scrollableParent.id = "scrollable-parent";

      const targetElement = createMockElement({
        parentElement: scrollableParent,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-parent": {
          "overflow-y": "auto",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableParent);
    });

    it("should return the first scrollable ancestor with overflow-y: scroll", () => {
      const scrollableParent = createMockElement({
        scrollHeight: 200,
        clientHeight: 100,
      });
      scrollableParent.id = "scrollable-parent";

      const targetElement = createMockElement({
        parentElement: scrollableParent,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-parent": {
          "overflow-y": "scroll",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableParent);
    });

    it("should return the first scrollable ancestor with overflow: auto", () => {
      const scrollableParent = createMockElement({
        scrollHeight: 200,
        clientHeight: 100,
      });
      scrollableParent.id = "scrollable-parent";

      const targetElement = createMockElement({
        parentElement: scrollableParent,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-parent": {
          "overflow-y": "visible",
          overflow: "auto",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableParent);
    });

    it("should return the first scrollable ancestor with overflow: scroll", () => {
      const scrollableParent = createMockElement({
        scrollHeight: 200,
        clientHeight: 100,
      });
      scrollableParent.id = "scrollable-parent";

      const targetElement = createMockElement({
        parentElement: scrollableParent,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-parent": {
          "overflow-y": "visible",
          overflow: "scroll",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableParent);
    });

    it("should skip non-scrollable ancestors and find the scrollable one", () => {
      const scrollableGrandparent = createMockElement({
        scrollHeight: 300,
        clientHeight: 150,
      });
      scrollableGrandparent.id = "scrollable-grandparent";

      const nonScrollableParent = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
        parentElement: scrollableGrandparent,
      });
      nonScrollableParent.id = "non-scrollable-parent";

      const targetElement = createMockElement({
        parentElement: nonScrollableParent,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-grandparent": {
          "overflow-y": "auto",
          overflow: "visible",
        },
        "DIV#non-scrollable-parent": {
          "overflow-y": "visible",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableGrandparent);
    });
  });

  describe("elements with scrollable styles but no scrollable content", () => {
    it("should skip elements with overflow: auto but no scrollable content", () => {
      const parentWithoutScrollableContent = createMockElement({
        scrollHeight: 100,
        clientHeight: 100, // Equal heights = no scrollable content
      });
      parentWithoutScrollableContent.id = "parent-no-content";

      const targetElement = createMockElement({
        parentElement: parentWithoutScrollableContent,
      });

      // Set parent's parent to null to reach the end of the chain
      Object.defineProperty(parentWithoutScrollableContent, "parentElement", {
        value: null,
        writable: true,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#parent-no-content": {
          "overflow-y": "auto",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(document.scrollingElement);
    });

    it("should skip elements with scrollHeight < clientHeight", () => {
      const parentWithSmallerScrollHeight = createMockElement({
        scrollHeight: 80,
        clientHeight: 100, // clientHeight > scrollHeight = no scrollable content
      });
      parentWithSmallerScrollHeight.id = "parent-smaller-scroll";

      const targetElement = createMockElement({
        parentElement: parentWithSmallerScrollHeight,
      });

      Object.defineProperty(parentWithSmallerScrollHeight, "parentElement", {
        value: null,
        writable: true,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#parent-smaller-scroll": {
          "overflow-y": "scroll",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(document.scrollingElement);
    });
  });

  describe("fallback to document.scrollingElement", () => {
    it("should return document.scrollingElement when no scrollable ancestors found", () => {
      const nonScrollableParent = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
      });
      nonScrollableParent.id = "non-scrollable";

      const targetElement = createMockElement({
        parentElement: nonScrollableParent,
      });

      Object.defineProperty(nonScrollableParent, "parentElement", {
        value: null,
        writable: true,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#non-scrollable": {
          "overflow-y": "visible",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(document.scrollingElement);
    });

    it("should return null when document.scrollingElement is null", () => {
      Object.defineProperty(document, "scrollingElement", {
        value: null,
        writable: true,
        configurable: true,
      });

      const nonScrollableParent = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
      });

      const targetElement = createMockElement({
        parentElement: nonScrollableParent,
      });

      Object.defineProperty(nonScrollableParent, "parentElement", {
        value: null,
        writable: true,
      });

      window.getComputedStyle = mockGetComputedStyle({
        DIV: {
          "overflow-y": "visible",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(null);
    });
  });

  describe("edge cases", () => {
    it("should handle element with no parent", () => {
      const orphanElement = createMockElement({
        parentElement: null,
      });

      const result = getScrollableAncestor(orphanElement);
      expect(result).toBe(document.scrollingElement);
    });

    it("should stop at document.documentElement", () => {
      const documentElement = document.createElement("html");
      Object.defineProperty(document, "documentElement", {
        value: documentElement,
        writable: true,
        configurable: true,
      });

      const parentElement = createMockElement({
        scrollHeight: 200,
        clientHeight: 100,
        parentElement: documentElement,
      });
      parentElement.id = "parent-of-doc-element";

      const targetElement = createMockElement({
        parentElement: parentElement,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#parent-of-doc-element": {
          "overflow-y": "visible",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(document.scrollingElement);
    });

    it("should handle various overflow values correctly", () => {
      const tests = [
        { overflowY: "hidden", overflow: "visible", shouldFind: false },
        { overflowY: "visible", overflow: "hidden", shouldFind: false },
        { overflowY: "auto", overflow: "hidden", shouldFind: true },
        { overflowY: "scroll", overflow: "hidden", shouldFind: true },
        { overflowY: "hidden", overflow: "auto", shouldFind: true },
        { overflowY: "hidden", overflow: "scroll", shouldFind: true },
      ];

      tests.forEach(({ overflowY, overflow, shouldFind }, index) => {
        const scrollableParent = createMockElement({
          scrollHeight: 200,
          clientHeight: 100,
        });
        scrollableParent.id = `test-parent-${index}`;

        const targetElement = createMockElement({
          parentElement: scrollableParent,
        });

        Object.defineProperty(scrollableParent, "parentElement", {
          value: null,
          writable: true,
        });

        window.getComputedStyle = mockGetComputedStyle({
          [`DIV#test-parent-${index}`]: {
            "overflow-y": overflowY,
            overflow: overflow,
          },
        });

        const result = getScrollableAncestor(targetElement);

        if (shouldFind) {
          expect(result).toBe(scrollableParent);
        } else {
          expect(result).toBe(document.scrollingElement);
        }
      });
    });
  });

  describe("complex DOM trees", () => {
    it("should traverse deep DOM trees correctly", () => {
      // Create a deep nesting: target -> parent1 -> parent2 -> parent3 -> scrollableParent
      const scrollableParent = createMockElement({
        scrollHeight: 400,
        clientHeight: 200,
      });
      scrollableParent.id = "scrollable-root";

      const parent3 = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
        parentElement: scrollableParent,
      });

      const parent2 = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
        parentElement: parent3,
      });

      const parent1 = createMockElement({
        scrollHeight: 100,
        clientHeight: 100,
        parentElement: parent2,
      });

      const targetElement = createMockElement({
        parentElement: parent1,
      });

      Object.defineProperty(scrollableParent, "parentElement", {
        value: null,
        writable: true,
      });

      window.getComputedStyle = mockGetComputedStyle({
        "DIV#scrollable-root": {
          "overflow-y": "auto",
          overflow: "visible",
        },
        DIV: {
          "overflow-y": "visible",
          overflow: "visible",
        },
      });

      const result = getScrollableAncestor(targetElement);
      expect(result).toBe(scrollableParent);
    });
  });
});
