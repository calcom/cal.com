// eslint-disable-next-line no-restricted-imports
import { debounce } from "lodash";
import { useCallback, useEffect, useRef } from "react";

// Dynamically adjusts DataTable height on mobile to prevent nested scrolling
// and ensure the table fits within the viewport without overflowing (hacky)
export function useProperHeightForMobile(ref: React.RefObject<HTMLDivElement>) {
  const lastOffsetY = useRef<number>();
  const lastWindowHeight = useRef<number>();
  const BOTTOM_NAV_HEIGHT = 64;
  const BUFFER = 32;

  const updateHeight = useCallback(
    debounce(() => {
      if (!ref.current || window.innerWidth >= 640) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.top !== lastOffsetY.current || window.innerHeight !== lastWindowHeight.current) {
        lastOffsetY.current = rect.top;
        lastWindowHeight.current = window.innerHeight;
        const height = window.innerHeight - lastOffsetY.current - BOTTOM_NAV_HEIGHT - BUFFER;
        ref.current.style.height = `${height}px`;
      }
    }, 200),
    [ref.current]
  );

  useEffect(() => {
    const handleResize = () => {
      updateHeight();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateHeight]);

  updateHeight();
}
