function canScroll(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const oy = style.getPropertyValue("overflow-y");
  const o = style.getPropertyValue("overflow");
  return ["auto", "scroll"].includes(oy) || ["auto", "scroll"].includes(o);
}

export function findScrollableAncestor(el: Element): Element | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.documentElement) {
    if (canScroll(node) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return document.scrollingElement ?? null;
}
