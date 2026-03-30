export interface BookingSheetKeyboardConfig {
  isSheetActive: () => boolean;
  canGoPrev: boolean | undefined;
  canGoNext: boolean | undefined;
  isTransitioning: boolean;
  handlePrevious: () => void;
  handleNext: () => void;
  getJoinLink: () => HTMLAnchorElement | null | undefined;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLElement) {
    return target.contentEditable === "true";
  }
  return false;
}

export function checkSheetActive(
  sheetContent: HTMLElement | null,
  activeElement: Element | null
): boolean {
  if (!activeElement || activeElement === document.body) {
    return true;
  }
  if (!sheetContent) return false;
  if (sheetContent.contains(activeElement)) {
    return true;
  }
  return !activeElement.closest("[data-radix-portal]");
}

export function createBookingSheetKeydownHandler(config: BookingSheetKeyboardConfig) {
  return (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) {
      return;
    }

    if (!config.isSheetActive()) {
      return;
    }

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        if (config.canGoPrev && !config.isTransitioning) {
          config.handlePrevious();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        if (config.canGoNext && !config.isTransitioning) {
          config.handleNext();
        }
        break;
      case "Enter": {
        const joinLink = config.getJoinLink();
        if (joinLink) {
          e.preventDefault();
          e.stopPropagation();
          joinLink.click();
        }
        break;
      }
    }
  };
}
