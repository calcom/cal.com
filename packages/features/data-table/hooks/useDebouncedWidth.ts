// eslint-disable-next-line no-restricted-imports
import debounce from "lodash/debounce";
import { useState, useEffect } from "react";

export function useDebouncedWidth(
  ref: React.RefObject<HTMLDivElement> | React.Ref<HTMLDivElement>,
  debounceMs = 100
) {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const current = ref && typeof ref === "object" && "current" in ref ? ref.current : null;
    if (!current) return;

    const element = current;
    setWidth(element.clientWidth);

    const debouncedSetWidth = debounce((width: number) => {
      setWidth(width);
    }, debounceMs);

    const resizeObserver = new ResizeObserver(([entry]) => {
      debouncedSetWidth(entry.target.clientWidth);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      debouncedSetWidth.cancel();
    };
  }, [ref]);

  return width;
}
