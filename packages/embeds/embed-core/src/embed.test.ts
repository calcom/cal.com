import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

vi.mock("./tailwindCss", () => ({
  default: "mockedTailwindCss",
}));

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
});
