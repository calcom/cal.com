import "../test/__mocks__/windowMatchMedia";

import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

vi.mock("./tailwindCss", () => ({
  default: "mockedTailwindCss",
}));

type ExpectedModalBoxAttrs = {
  theme: string;
  layout: string;
  pageType: string | null;
  state?: "loading" | "loaded" | "failed" | "reopened" | "closed" | "prerendering";
  uid?: string;
};

function expectCalModalBoxToBeInDocument(expectedAttrs: ExpectedModalBoxAttrs) {
  const calModalBox = document.querySelector("cal-modal-box") as HTMLElement;
  expect(calModalBox).toBeTruthy();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const modalBox = calModalBox!;

  // Verify required attributes are present
  expect(modalBox.hasAttribute("uid")).toBe(true);
  expect(modalBox.getAttribute("uid")).toMatch(/^\d+$/); // UID should be numeric

  // Verify data attributes exist (even if empty)
  expect(modalBox.getAttribute("data-theme")).toBe(expectedAttrs.theme);
  expect(modalBox.getAttribute("data-layout")).toBe(expectedAttrs.layout);
  // Verify expected attributes if provided
  if (expectedAttrs.state) {
    expect(modalBox.getAttribute("state")).toBe(expectedAttrs.state);
  }

  if (expectedAttrs.pageType) {
    expect(modalBox.getAttribute("data-page-type")).toBe(expectedAttrs.pageType);
  }
  if (expectedAttrs.uid) {
    expect(modalBox.getAttribute("uid")).toBe(expectedAttrs.uid);
  }

  return modalBox;
}

function expectToHaveIframeWithAttributes({
  cal,
  element,
  createIframeArgs,
}: {
  cal: any;
  element: HTMLElement;
  createIframeArgs: {
    calLink: string;
    config: Record<string, string>;
    calOrigin: string | null;
  };
}) {
  expect(cal.createIframe).toHaveBeenCalledWith(createIframeArgs);
  const iframe = element.querySelector("iframe") as HTMLIFrameElement;
  expect(iframe).toBeTruthy();
  expect(iframe.src).toContain(createIframeArgs.calLink);
}

describe("Cal", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let CalClass: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cal: any;

  function mockSearchParams(search: string) {
    Object.defineProperty(window, "location", {
      value: { search },
      writable: true,
    });
  }

  beforeAll(async () => {
    // Mock window.Cal
    const mockCal = {
      q: [],
      ns: {},
    };
    Object.defineProperty(window, "Cal", {
      value: mockCal,
      writable: true,
    });

    CalClass = (await import("./embed")).Cal;
  });
  beforeEach(() => {
    cal = new CalClass("test-namespace", []);
    cal.getConfig = vi.fn().mockReturnValue({ calOrigin: "https://app.cal.com" });
    // Reset the document body before each test
    document.body.innerHTML = "";
  });
  describe("createIframe", () => {
    describe("params handling with forwardQueryParams feature enabled", () => {
      beforeEach(() => {
        cal = new CalClass("test-namespace", []);
        window.Cal.config = { forwardQueryParams: true };
        // Mock the getConfig method
        cal.getConfig = vi.fn().mockReturnValue({ calOrigin: "https://app.cal.com" });
      });

      it("should merge query parameters from URL and explicit params", () => {
        mockSearchParams("?existingParam=value");

        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: { newParam: "newValue" },
          calOrigin: null,
        });

        expect(iframe.src).toContain("existingParam=value");
        expect(iframe.src).toContain("newParam=newValue");
      });

      it("should not lose duplicate params in page query", () => {
        mockSearchParams("?param1=value1&param1=value2");

        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: { param2: "value3" },
          calOrigin: null,
        });

        const urlParams = new URLSearchParams(new URL(iframe.src).search);
        const paramValues = urlParams.getAll("param1");
        expect(paramValues).toEqual(["value1", "value2"]);
      });

      it("should override the duplicate params in page if the same param exists in explicit config", () => {
        mockSearchParams("?param=value1&param=value2");

        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: { param: "value3" },
          calOrigin: null,
        });

        const urlParams = new URLSearchParams(new URL(iframe.src).search);
        const paramValues = urlParams.getAll("param");
        expect(paramValues).toEqual(["value3"]);
      });

      it("should exclude reserved params from the page URL(as these could be unintentional to pass these query params to embed, so better to exclude them and avoid crashing the booking page)", () => {
        mockSearchParams("?date=2023-05-01&duration=30&hello=world");

        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: {
            email: "test@example.com",
          },
          calOrigin: null,
        });

        expect(iframe.src).not.toContain("date=");
        expect(iframe.src).not.toContain("duration=");
        expect(iframe.src).toContain("hello=");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should allow configuring reserved params through config(as it is explicitly passed by user)", () => {
        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: {
            date: "2023-05-01",
            duration: "30",
            email: "test@example.com",
          },
          calOrigin: null,
        });

        expect(iframe.src).toContain("date=2023-05-01");
        expect(iframe.src).toContain("duration=30");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should allow configuring reserved params through direct URL params to embed calLink(as it is explicitly passed by user)", () => {
        const iframe = cal.createIframe({
          calLink: "john-doe/meeting?date=2023-05-01&duration=30&email=test@example.com",
          calOrigin: null,
        });

        expect(iframe.src).toContain("date=2023-05-01");
        expect(iframe.src).toContain("duration=30");
        expect(iframe.src).toContain("email=test%40example.com");
      });

      it("should respect forwardQueryParams setting to disable sending page query params but still send the ones in the config", () => {
        mockSearchParams("?param1=value");

        window.Cal.config = { forwardQueryParams: false };

        const iframe = cal.createIframe({
          calLink: "john-doe/meeting",
          config: { param2: "value" },
          calOrigin: null,
        });

        expect(iframe.src).not.toContain("param1=value");
        expect(iframe.src).toContain("param2=value");
      });
    });
  });

  describe("modal", () => {
    beforeEach(() => {
      cal.api.cal.createIframe = vi.fn().mockImplementation(({ calLink }) => {
        const iframe = document.createElement("iframe");
        iframe.src = `http://example.com/${calLink}`;
        return iframe;
      });
    });

    it("should create a new modal when none exists", () => {
      cal.api.modal({
        calLink: "john-doe/meeting",
        config: {
          theme: "light",
          layout: "modern",
        },
      });

      const modalBox = expectCalModalBoxToBeInDocument({
        theme: "light",
        layout: "modern",
        pageType: null,
      });

      expectToHaveIframeWithAttributes({
        cal: cal.api.cal,
        element: modalBox,
        createIframeArgs: {
          calLink: "john-doe/meeting",
          config: {
            embedType: "modal",
            theme: "light",
            layout: "modern",
          },
          calOrigin: null,
        },
      });
    });

    it.only("should handle prerendering mode correctly", () => {
      cal.api.modal({
        calLink: "john-doe/meeting",
        config: {
          theme: "light",
          layout: "modern",
        },
        calOrigin: null,
        __prerender: true,
      });

      const modalBox = expectCalModalBoxToBeInDocument({
        state: "prerendering",
        pageType: null,
        theme: "light",
        layout: "modern",
      });

      expectToHaveIframeWithAttributes({
        cal: cal.api.cal,
        element: modalBox,
        createIframeArgs: {
          calLink: "john-doe/meeting",
          config: {
            embedType: "modal",
            theme: "light",
            layout: "modern",
            prerender: "true",
          },
          calOrigin: null,
        },
      });
    });

    it("should reuse existing modal with same UID", () => {
      // First modal creation
      cal.api.modal({
        calLink: "john-doe/meeting",
      });
      const firstModal = expectCalModalBoxToBeInDocument();
      const firstUid = firstModal.getAttribute("uid");

      // Second modal creation with same conditions
      cal.api.modal({
        calLink: "john-doe/meeting",
      });

      expectCalModalBoxToBeInDocument({
        state: "reopened",
        uid: firstUid,
      });
      expect(document.querySelectorAll("cal-modal-box").length).toBe(1);
    });

    it("should reset iframe when calLink changes", () => {
      // First modal creation
      cal.api.modal({
        calLink: "john-doe/meeting",
      });

      // Second modal creation with different calLink
      cal.api.modal({
        calLink: "john-doe/different-meeting",
      });

      expectCalModalBoxToBeInDocument({
        state: "loading",
      });
    });

    it("should throw error for invalid iframeAttrs", () => {
      expect(() =>
        cal.api.modal({
          calLink: "john-doe/meeting",
          config: {
            iframeAttrs: "invalid", // Should be an object
          },
        })
      ).toThrow("iframeAttrs should be an object");
    });

    it("should apply correct styling to iframe", () => {
      cal.api.modal({
        calLink: "john-doe/meeting",
      });

      const modalBox = expectCalModalBoxToBeInDocument();
      const iframe = modalBox.querySelector("iframe") as HTMLIFrameElement;
      expect(iframe.style.borderRadius).toBe("8px");
      expect(iframe.style.height).toBe("100%");
      expect(iframe.style.width).toBe("100%");
    });

    it("should handle config props correctly", () => {
      cal.api.modal({
        calLink: "john-doe/meeting",
        config: {
          theme: "dark",
          layout: "modern",
        },
      });

      expectCalModalBoxToBeInDocument({
        theme: "dark",
        layout: "modern",
      });
    });
  });
});
