import { useEffect, useRef } from "react";

export function useElementByClassName<T extends HTMLElement = HTMLDivElement>(
  className?: string
): React.RefObject<T> {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (className) {
      const element = document.getElementsByClassName(className)[0] as T;
      elementRef.current = element || null;
    } else {
      elementRef.current = null;
    }
  }, [className]);

  return elementRef;
}
