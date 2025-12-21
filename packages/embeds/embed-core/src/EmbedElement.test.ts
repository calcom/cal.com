import { fakeDeviceMatchesMediaQuery } from "../test/__mocks__/windowMatchMedia";

import type { AllPossibleLayouts, EmbedPageType } from "src/types";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { Mock } from "vitest";

import { EmbedElement } from "./EmbedElement";
import inlineHTML from "./Inline/inlineHtml";
import { EMBED_DARK_THEME_CLASS, EMBED_LIGHT_THEME_CLASS } from "./constants";
import { getColorSchemeDarkQuery } from "./ui-utils";

(function defineEmbedTestElement() {
  class TestEmbedElement extends EmbedElement {
    constructor({
      isModal,
      getSkeletonData,
      dataset,
    }: {
      isModal?: boolean;
      getSkeletonData: Mock;
      dataset: Record<string, string>;
    }) {
      super({
        isModal: isModal ?? false,
        getSkeletonData,
        // @ts-expect-error - Integration test mode
        dataset,
      });
    }
  }
  customElements.define("test-embed", TestEmbedElement);
})();

function buildMediaQueryListEvent({ type, matches }: { type: string; matches: boolean }) {
  return {
    type,
    matches,
  } as unknown as MediaQueryListEvent;
}

function mockGetSkeletonData() {
  return vi
    .fn()
    .mockImplementation(
      ({ layout, pageType }: { layout: AllPossibleLayouts; pageType: EmbedPageType | null }) => {
        return {
          skeletonContent: `<div id="skeleton-content" class="${layout}-layout ${pageType}-pageType">Skeleton Content</div>`,
          skeletonContainerStyle: "height: 500px",
          skeletonStyle: "display: block",
        };
      }
    );
}

function createTestEmbedElement(data: {
  dataset?: { pageType?: string; theme?: string; layout?: AllPossibleLayouts };
  getSkeletonData?: Mock;
  isModal?: boolean;
}) {
  const { dataset, getSkeletonData = mockGetSkeletonData() } = data;
  const element = new (customElements.get("test-embed")!)({
    isModal: data.isModal ?? false,
    getSkeletonData,
    dataset: dataset || {},
  }) as EmbedElement;

  // Mock shadow root
  const shadowRoot = {
    querySelector: element.querySelector.bind(element),
    host: element,
  };

  Object.defineProperty(element, "shadowRoot", {
    value: shadowRoot,
    writable: true,
  });

  element.innerHTML = inlineHTML({
    layout: dataset?.layout,
    pageType: dataset?.pageType as EmbedPageType | null,
    externalThemeClass: dataset?.theme === "dark" ? EMBED_DARK_THEME_CLASS : EMBED_LIGHT_THEME_CLASS,
  });

  document.body.appendChild(element);

  return element;
}

function expectSkeletonLoader(element: EmbedElement) {
  const skeletonEl = element.getSkeletonElement();
  const loaderEl = element.getLoaderElement();

  expect(skeletonEl.style.display).toBe("block");
  expect(loaderEl.style.display).toBe("none");
}

function expectDefaultLoader(element: EmbedElement) {
  const skeletonEl = element.getSkeletonElement();
  const loaderEl = element.getLoaderElement();

  expect(skeletonEl.style.display).toBe("none");
  expect(loaderEl.style.display).toBe("block");
}

function expectLoaderToBeHidden(element: EmbedElement) {
  const skeletonEl = element.getSkeletonElement();
  const loaderEl = element.getLoaderElement();

  expect(skeletonEl.style.display).toBe("none");
  expect(loaderEl.style.display).toBe("none");
}

function expectLayoutToBe(layout: AllPossibleLayouts, element: EmbedElement) {
  expect(element.layout).toBe(layout);
  const skeletonEl = element.getSkeletonElement();
  expect(skeletonEl.querySelector(`${layout}-layout`)).toBeDefined();
}

function mockGetComputedStyle() {
  // getComputedStyle isn't properly implemented in JSDOM and doesn't return height property
  window.getComputedStyle = vi.fn().mockImplementation((el: HTMLElement) => {
    if (el.style.display === "none") {
      return {
        height: "0px",
      };
    } else {
      return {
        height: "1010px",
      };
    }
  });
}

describe("EmbedElement", () => {
  let element: EmbedElement;

  beforeEach(() => {
    // Register the custom element
    mockGetComputedStyle();
  });

  afterEach(() => {
    if (!element) {
      throw new Error("`element` not defined");
    }
    document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  describe("Loader Behavior", () => {
    describe("Non-Modal Mode", () => {
      it("should show skeleton loader for supported page types on creation", () => {
        element = createTestEmbedElement({
          dataset: {
            pageType: "user.event.booking.slots",
          },
        });

        expectSkeletonLoader(element);
      });

      it("should show default loader for when page type is not provided", () => {
        element = createTestEmbedElement({
          dataset: {},
        });

        expectDefaultLoader(element);
      });

      it("should show skeleton loader for any non-empty page type (including unsupported ones)", () => {
        element = createTestEmbedElement({
          dataset: {
            pageType: "unknown",
          },
        });

        expectSkeletonLoader(element);
      });

      it("should hide skeleton loader when toggled off", () => {
        element = createTestEmbedElement({
          dataset: {
            pageType: "user.event.booking.slots",
          },
        });

        expectSkeletonLoader(element);

        element.toggleLoader(false);
        expectLoaderToBeHidden(element);
      });

      it("should hide default loader when toggled off", () => {
        element = createTestEmbedElement({});

        expectDefaultLoader(element);

        element.toggleLoader(false);
        expectLoaderToBeHidden(element);
      });

      it("should update container height correctly", () => {
        element = createTestEmbedElement({
          dataset: {
            pageType: "user.event.booking.slots",
          },
        });
        const skeletonContainerEl = element.getSkeletonContainerElement();

        // Initial height should be set based on skeleton height
        expect(skeletonContainerEl.style.height).not.toBe("");

        element.toggleLoader(false);
        expect(skeletonContainerEl.style.height).toBe("");
        expect(skeletonContainerEl.style.display).toBe("none");
      });
    });

    describe("Modal Mode", () => {
      let isModal: boolean;
      beforeEach(() => {
        isModal = true;
      });

      it("should show default loader only when page type is not provided", () => {
        element = createTestEmbedElement({
          isModal,
        });
        delete element.dataset.pageType;

        expectDefaultLoader(element);
      });

      it("should show skeleton loader for supported page types", () => {
        element = createTestEmbedElement({
          isModal,
          dataset: {
            pageType: "user.event.booking.slots",
          },
        });

        expectSkeletonLoader(element);
      });

      it("should adjust skeletonContainer height correctly", () => {
        element = createTestEmbedElement({
          isModal,
          dataset: {
            pageType: "user.event.booking.slots",
          },
        });
        const skeletonContainerEl = element.getSkeletonContainerElement();

        // Modal should have maxHeight set
        expect(skeletonContainerEl.style.maxHeight).not.toBe("");
        expect(skeletonContainerEl.style.height).not.toBe("");

        element.toggleLoader(false);
        expect(skeletonContainerEl.style.height).toBe("");
        expect(skeletonContainerEl.style.display).toBe("");
        expect(skeletonContainerEl.style.maxHeight).toBe("");
      });
    });

    describe("Theme Handling", () => {
      it("should apply theme class correctly", () => {
        element = createTestEmbedElement({
          dataset: {
            theme: "dark",
          },
          getSkeletonData: vi.fn(),
        });
        expect(element.classList.contains(EMBED_DARK_THEME_CLASS)).toBe(true);
        expect(element.classList.contains(EMBED_LIGHT_THEME_CLASS)).toBe(false);
      });

      it("should update theme class when system preference changes as long as embed theme is not set", () => {
        element = createTestEmbedElement({
          getSkeletonData: vi.fn(),
        });
        getColorSchemeDarkQuery().dispatchEvent(buildMediaQueryListEvent({ type: "change", matches: true }));

        expect(element.classList.contains(EMBED_DARK_THEME_CLASS)).toBe(true);
        expect(element.classList.contains(EMBED_LIGHT_THEME_CLASS)).toBe(false);
      });

      it("should not update theme on system color scheme change when embed theme is set", () => {
        element = createTestEmbedElement({
          dataset: {
            theme: "light",
          },
          getSkeletonData: vi.fn(),
        });
        getColorSchemeDarkQuery().dispatchEvent(buildMediaQueryListEvent({ type: "change", matches: true }));
        expect(element.classList.contains(EMBED_LIGHT_THEME_CLASS)).toBe(true);
      });
    });

    describe("Layout Handling", () => {
      it("should set layout to month_view even if mobile is provided when device matches max-width: >768px", () => {
        fakeDeviceMatchesMediaQuery("(max-width: 800px)");
        element = createTestEmbedElement({
          dataset: { layout: "mobile" },
        });

        expectLayoutToBe("month_view", element);
      });

      it("should set layout to mobile even if month_view is provided when device matches max-width: 768px", () => {
        fakeDeviceMatchesMediaQuery("(max-width: 768px)");
        element = createTestEmbedElement({
          dataset: { layout: "month_view" },
        });

        expectLayoutToBe("mobile", element);
      });

      it("should set layout to month_view even if mobile is provided when device matches max-width: >768px", () => {
        fakeDeviceMatchesMediaQuery("(max-width: 800px)");
        element = createTestEmbedElement({
          dataset: { layout: "mobile" },
        });

        expectLayoutToBe("month_view", element);
      });

      it("should set layout from month_view to mobile when device changes its max-width from >768px to <=768px", () => {
        fakeDeviceMatchesMediaQuery("(max-width: 800px)");
        element = createTestEmbedElement({
          dataset: { layout: "month_view" },
        });

        expectLayoutToBe("month_view", element);

        fakeDeviceMatchesMediaQuery("(max-width: 768px)");
        // It hasn't changed because resize didn't happen
        expectLayoutToBe("month_view", element);

        // Now resize the window
        window.dispatchEvent(new Event("resize"));
        expectLayoutToBe("mobile", element);
      });

      it("should set layout from mobile to month_view when device changes its max-width from <=768px to >768px", () => {
        fakeDeviceMatchesMediaQuery("(max-width: 768px)");
        element = createTestEmbedElement({
          dataset: { layout: "mobile" },
        });

        expectLayoutToBe("mobile", element);

        fakeDeviceMatchesMediaQuery("(max-width: 800px)");
        // It hasn't changed because resize didn't happen
        expectLayoutToBe("mobile", element);

        // Now resize the window
        window.dispatchEvent(new Event("resize"));
        expectLayoutToBe("month_view", element);
      });
    });
  });
});
