import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sdkActionManager } from "../../sdk-event";
import { embedStore } from "../lib/embedStore";
import { keepParentInformedAboutDimensionChanges } from "../lib/utils";
import { fakeCurrentDocumentUrl } from "./test-utils";

type DimensionEvent = {
  isFirstTime: boolean;
  height: number;
  width: number;
};

type DOMTestData = {
  documentElementScrollDimensions: { height: number; width: number };
  mainElementDimensions: { height: number; width: number };
  readyState: "complete" | "loading";
};

type DomEnvironment = DOMTestData & {
  setReadyState: (readyState: "complete" | "loading") => void;
};

const RUN_ASAP_TICK_MS = 50;
const WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS = 100;

const createDOMEnvironment = (testData: DOMTestData) => {
  Object.defineProperty(document, "readyState", {
    writable: true,
    configurable: true,
    value: testData.readyState,
  });

  const mainElement = document.createElement("main");
  mainElement.className = "main";
  document.body.appendChild(mainElement);

  Object.defineProperty(document.documentElement, "scrollHeight", {
    writable: true,
    configurable: true,
    value: testData.documentElementScrollDimensions.height,
  });
  Object.defineProperty(document.documentElement, "scrollWidth", {
    writable: true,
    configurable: true,
    value: testData.documentElementScrollDimensions.width,
  });

  const originalGetComputedStyle = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    if (element.classList?.contains("main") || element.tagName === "MAIN") {
      return {
        height: `${testData.mainElementDimensions.height}px`,
        width: `${testData.mainElementDimensions.width}px`,
        marginTop: "0px",
        marginBottom: "0px",
        marginLeft: "0px",
        marginRight: "0px",
      } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(element);
  });

  return {
    ...testData,
    setReadyState: (readyState: "complete" | "loading") => {
      Object.defineProperty(document, "readyState", {
        writable: true,
        configurable: true,
        value: readyState,
      });
    },
  };
};

const resetEmbedState = () => {
  embedStore.providedCorrectHeightToParent = false;
  embedStore.windowLoadEventFired = false;
  fakeCurrentDocumentUrl({ params: {} });
};

const createDimensionTracker = () => {
  const events: DimensionEvent[] = [];
  sdkActionManager?.on("__dimensionChanged", (e) => {
    events.push({
      isFirstTime: e.detail.data.isFirstTime,
      height: e.detail.data.iframeHeight,
      width: e.detail.data.iframeWidth,
    });
  });
  return events;
};

const expectCorrectHeightNotProvided = () => {
  expect(embedStore.providedCorrectHeightToParent).toBe(false);
};

const expectCorrectHeightProvided = () => {
  expect(embedStore.providedCorrectHeightToParent).toBe(true);
};

const expectFirstPassEvent = (
  event: DimensionEvent | undefined,
  {
    documentElementScrollHeight,
    documentElementScrollWidth,
  }: {
    documentElementScrollHeight: number;
    documentElementScrollWidth: number;
  }
) => {
  expect(event).toBeDefined();
  expect(event?.isFirstTime).toBe(true);
  expect(event?.height).toBe(documentElementScrollHeight);
  expect(event?.width).toBe(documentElementScrollWidth);
};

const expectSecondPassEvent = (
  event: DimensionEvent | undefined,
  {
    mainElementHeight,
    mainElementWidth,
  }: {
    mainElementHeight: number;
    mainElementWidth: number;
  }
) => {
  expect(event).toBeDefined();
  expect(event?.isFirstTime).toBe(false);
  expect(event?.height).toBe(mainElementHeight);
  expect(event?.width).toBe(mainElementWidth);
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("keepParentInformedAboutDimensionChanges", () => {
  let domEnvironment: DomEnvironment;
  beforeEach(() => {
    domEnvironment = createDOMEnvironment({
      documentElementScrollDimensions: { height: 1000, width: 800 },
      mainElementDimensions: { height: 500, width: 400 },
      readyState: "complete",
    });
    resetEmbedState();
  });

  describe("when iframe dimensions are calculated", () => {
    it("should not mark height as provided during initial dimension pass", async () => {
      const dimensionEvents = createDimensionTracker();

      keepParentInformedAboutDimensionChanges({ embedStore });
      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS + WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS);
      expectCorrectHeightNotProvided();
      const firstEvent = dimensionEvents[0];
      expectFirstPassEvent(firstEvent, {
        documentElementScrollHeight: domEnvironment.documentElementScrollDimensions.height,
        documentElementScrollWidth: domEnvironment.documentElementScrollDimensions.width,
      });
    });

    it("should mark height as provided after second dimension pass completes", async () => {
      const dimensionEvents = createDimensionTracker();

      keepParentInformedAboutDimensionChanges({ embedStore });

      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS + WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS);
      expectCorrectHeightNotProvided();

      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS);
      expectCorrectHeightProvided();
      const secondEvent = dimensionEvents[1];
      expectSecondPassEvent(secondEvent, {
        mainElementHeight: domEnvironment.mainElementDimensions.height,
        mainElementWidth: domEnvironment.mainElementDimensions.width,
      });
    });
  });

  describe("when window load state changes", () => {
    it("should wait for window load completion before calculating dimensions", async () => {
      domEnvironment = createDOMEnvironment({
        documentElementScrollDimensions: { height: 1000, width: 800 },
        mainElementDimensions: { height: 500, width: 400 },
        readyState: "loading",
      });

      const dimensionEvents = createDimensionTracker();

      keepParentInformedAboutDimensionChanges({ embedStore });

      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS + WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS);

      expect(dimensionEvents.length).toBe(0);
      expectCorrectHeightNotProvided();

      domEnvironment.setReadyState("complete");

      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS + WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS);
      expect(dimensionEvents.length).toBe(1);
    });

    it("should fire window load complete event on first pass", async () => {
      domEnvironment = createDOMEnvironment({
        documentElementScrollDimensions: { height: 1000, width: 800 },
        mainElementDimensions: { height: 500, width: 400 },
        readyState: "complete",
      });

      const windowLoadEvents: unknown[] = [];
      sdkActionManager?.on("__windowLoadComplete", () => {
        windowLoadEvents.push({});
      });

      keepParentInformedAboutDimensionChanges({ embedStore });

      await vi.advanceTimersByTimeAsync(RUN_ASAP_TICK_MS + WINDOW_LOAD_COMPLETE_CONFIRMED_DELAY_MS);

      expect(windowLoadEvents.length).toBe(1);
      expect(embedStore.windowLoadEventFired).toBe(true);
    });
  });
});
