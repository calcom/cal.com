export function getScrollableAncestor(element: Element): Element | null {
  // Start from parent because we are looking for ancestors of the element.
  let currentElement: HTMLElement | null = element.parentElement;

  // Walk up the DOM tree to find the first scrollable(across y-axis) ancestor
  while (currentElement && currentElement !== document.documentElement) {
    const computedStyle = window.getComputedStyle(currentElement);
    const overflowY = computedStyle.getPropertyValue("overflow-y");
    const overflow = computedStyle.getPropertyValue("overflow");

    // Check if element is scrollable
    const isScrollable = ["auto", "scroll"].includes(overflowY) || ["auto", "scroll"].includes(overflow);

    // Check if element actually has scrollable content
    const hasScrollableContent = currentElement.scrollHeight > currentElement.clientHeight;

    if (isScrollable && hasScrollableContent) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  if (!document.scrollingElement) {
    return null;
  }

  return document.scrollingElement;
}
