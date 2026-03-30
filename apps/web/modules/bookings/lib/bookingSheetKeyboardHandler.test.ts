import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  isEditableTarget,
  checkSheetActive,
  createBookingSheetKeydownHandler,
  type BookingSheetKeyboardConfig,
} from "./bookingSheetKeyboardHandler";

function createMockKeyboardEvent(key: string, target?: EventTarget | null): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }
  return event;
}

describe("isEditableTarget", () => {
  it("returns true for input elements", () => {
    const input = document.createElement("input");
    expect(isEditableTarget(input)).toBe(true);
  });

  it("returns true for textarea elements", () => {
    const textarea = document.createElement("textarea");
    expect(isEditableTarget(textarea)).toBe(true);
  });

  it("returns true for contenteditable elements", () => {
    const div = document.createElement("div");
    div.contentEditable = "true";
    expect(isEditableTarget(div)).toBe(true);
  });

  it("returns false for regular div elements", () => {
    const div = document.createElement("div");
    expect(isEditableTarget(div)).toBe(false);
  });

  it("returns false for button elements", () => {
    const button = document.createElement("button");
    expect(isEditableTarget(button)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("checkSheetActive", () => {
  it("returns true when no element has focus", () => {
    expect(checkSheetActive(document.createElement("div"), null)).toBe(true);
  });

  it("returns true when document.body is focused", () => {
    expect(checkSheetActive(document.createElement("div"), document.body)).toBe(true);
  });

  it("returns false when sheetContent is null", () => {
    const focusedElement = document.createElement("button");
    document.body.appendChild(focusedElement);
    expect(checkSheetActive(null, focusedElement)).toBe(false);
    document.body.removeChild(focusedElement);
  });

  it("returns true when focused element is inside sheetContent", () => {
    const sheetContent = document.createElement("div");
    const button = document.createElement("button");
    sheetContent.appendChild(button);
    document.body.appendChild(sheetContent);
    expect(checkSheetActive(sheetContent, button)).toBe(true);
    document.body.removeChild(sheetContent);
  });

  it("returns true when focused element is outside any Radix portal", () => {
    const sheetContent = document.createElement("div");
    const outsideButton = document.createElement("button");
    document.body.appendChild(sheetContent);
    document.body.appendChild(outsideButton);
    expect(checkSheetActive(sheetContent, outsideButton)).toBe(true);
    document.body.removeChild(sheetContent);
    document.body.removeChild(outsideButton);
  });

  it("returns false when focused element is inside a Radix portal (overlay)", () => {
    const sheetContent = document.createElement("div");
    const portal = document.createElement("div");
    portal.setAttribute("data-radix-portal", "");
    const dropdownButton = document.createElement("button");
    portal.appendChild(dropdownButton);
    document.body.appendChild(sheetContent);
    document.body.appendChild(portal);
    expect(checkSheetActive(sheetContent, dropdownButton)).toBe(false);
    document.body.removeChild(sheetContent);
    document.body.removeChild(portal);
  });
});

describe("createBookingSheetKeydownHandler", () => {
  let handlePrevious: () => void;
  let handleNext: () => void;
  let mockJoinLink: HTMLAnchorElement;
  let config: BookingSheetKeyboardConfig;

  beforeEach(() => {
    handlePrevious = vi.fn();
    handleNext = vi.fn();
    mockJoinLink = document.createElement("a");
    mockJoinLink.click = vi.fn();

    config = {
      isSheetActive: () => true,
      canGoPrev: true,
      canGoNext: true,
      isTransitioning: false,
      handlePrevious,
      handleNext,
      getJoinLink: () => null,
    };
  });

  describe("ArrowDown", () => {
    it("navigates to next when canGoNext is true", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowDown");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handleNext).toHaveBeenCalled();
    });

    it("stops propagation but does NOT navigate when canGoNext is false", () => {
      config.canGoNext = false;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowDown");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();
    });

    it("stops propagation but does NOT navigate when transitioning", () => {
      config.isTransitioning = true;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowDown");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();
    });
  });

  describe("ArrowUp", () => {
    it("navigates to previous when canGoPrev is true", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowUp");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handlePrevious).toHaveBeenCalled();
    });

    it("stops propagation but does NOT navigate when canGoPrev is false", () => {
      config.canGoPrev = false;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowUp");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handlePrevious).not.toHaveBeenCalled();
    });

    it("stops propagation but does NOT navigate when transitioning", () => {
      config.isTransitioning = true;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("ArrowUp");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(handlePrevious).not.toHaveBeenCalled();
    });
  });

  describe("Enter", () => {
    it("clicks join link when available", () => {
      config.getJoinLink = () => mockJoinLink;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("Enter");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(mockJoinLink.click).toHaveBeenCalled();
    });

    it("does nothing when no join link is available", () => {
      config.getJoinLink = () => null;
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("Enter");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe("sheet inactive", () => {
    it("does not handle any keys when sheet is inactive", () => {
      config.isSheetActive = () => false;
      const handler = createBookingSheetKeydownHandler(config);

      const downEvent = createMockKeyboardEvent("ArrowDown");
      const downSpy = vi.spyOn(downEvent, "stopPropagation");
      handler(downEvent);
      expect(downSpy).not.toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();

      const upEvent = createMockKeyboardEvent("ArrowUp");
      const upSpy = vi.spyOn(upEvent, "stopPropagation");
      handler(upEvent);
      expect(upSpy).not.toHaveBeenCalled();
      expect(handlePrevious).not.toHaveBeenCalled();
    });
  });

  describe("editable targets", () => {
    it("ignores events from input elements", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const input = document.createElement("input");
      const event = createMockKeyboardEvent("ArrowDown", input);
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();
    });

    it("ignores events from textarea elements", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const textarea = document.createElement("textarea");
      const event = createMockKeyboardEvent("ArrowDown", textarea);
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();
    });

    it("ignores events from contenteditable elements", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const div = document.createElement("div");
      div.contentEditable = "true";
      const event = createMockKeyboardEvent("ArrowDown", div);
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(handleNext).not.toHaveBeenCalled();
    });
  });

  describe("unhandled keys", () => {
    it("does not preventDefault or stopPropagation for unhandled keys", () => {
      const handler = createBookingSheetKeydownHandler(config);
      const event = createMockKeyboardEvent("Tab");
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      const stopPropagationSpy = vi.spyOn(event, "stopPropagation");

      handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(stopPropagationSpy).not.toHaveBeenCalled();
    });
  });
});
