import "../../test/__mocks__/windowMatchMedia";

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { EmbedElement } from "../EmbedElement";
import { ModalBox } from "./ModalBox";

function setupWindowCal() {
  // Mock window.Cal.__css which is required by ModalBox constructor
  if (!window.Cal) {
    // @ts-expect-error - Test setup
    window.Cal = {};
  }
  window.Cal.__css = "/* mock css */";
}

// Register ModalBox as a custom element for testing
if (!customElements.get("cal-modal-box")) {
  customElements.define("cal-modal-box", ModalBox);
}

describe("ModalBox", () => {
  let modalBox: ModalBox;

  beforeEach(() => {
    setupWindowCal();
  });

  afterEach(() => {
    if (modalBox && modalBox.parentNode) {
      document.body.removeChild(modalBox);
    }
    vi.restoreAllMocks();
  });

  it("should verify that connectedCallback and disconnectedCallback of ModalBox call the EmbedElement's methods", () => {
    const embedElementConnectedCallbackSpy = vi.spyOn(EmbedElement.prototype, "connectedCallback");
    const embedElementDisconnectedCallbackSpy = vi.spyOn(EmbedElement.prototype, "disconnectedCallback");

    modalBox = new ModalBox();

    document.body.appendChild(modalBox);

    expect(embedElementConnectedCallbackSpy).toHaveBeenCalledTimes(1);

    document.body.removeChild(modalBox);

    expect(embedElementDisconnectedCallbackSpy).toHaveBeenCalledTimes(1);
  });
});
