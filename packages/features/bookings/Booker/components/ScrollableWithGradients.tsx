import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollGradients {
  top: boolean;
  bottom: boolean;
}

interface ScrollableWithGradientsProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

const SCROLL_THRESHOLD = 5; // Pixels before showing gradient

export function ScrollableWithGradients({ children, className, ariaLabel }: ScrollableWithGradientsProps) {
  const [gradients, setGradients] = useState<ScrollGradients>({ top: false, bottom: false });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const updateGradients = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const { scrollTop, scrollHeight, clientHeight } = node;
    const top = scrollTop > SCROLL_THRESHOLD;
    const bottom = scrollTop + clientHeight < scrollHeight - SCROLL_THRESHOLD;

    setGradients((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      updateGradients();
    },
    [updateGradients]
  );

  // Handle resize events (window resize, font load, etc.)
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const resizeObserver = new ResizeObserver(updateGradients);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  }, [updateGradients]);

  return (
    <div className="relative">
      <div
        ref={setRef}
        onScroll={updateGradients}
        className={className}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}>
        {children}
      </div>
      {gradients.top && (
        <div
          className="from-default pointer-events-none absolute left-0 right-0 top-0 h-8 bg-gradient-to-b to-transparent dark:from-[var(--cal-bg-muted)]"
          aria-hidden="true"
        />
      )}
      {gradients.bottom && (
        <div
          className="from-default pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t to-transparent dark:from-[var(--cal-bg-muted)]"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
