import { useLayoutEffect, useRef } from "react";

export function useFillRemainingHeight<T extends HTMLElement = HTMLDivElement>(offset = 0) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const top = Math.round(el.getBoundingClientRect().top + offset);
      const newHeight = `calc(100dvh - ${top}px)`;
      if (el.style.height !== newHeight) {
        el.style.height = newHeight;
      }
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(document.body);

    return () => observer.disconnect();
  }, [offset]);

  return ref;
}
