import { useCallback, useRef, useState, type ReactNode } from "react";

interface ScrollGradients {
  top: boolean;
  bottom: boolean;
}

interface ScrollableWithGradientsProps {
  children: ReactNode;
  className?: string;
}

export function ScrollableWithGradients({ children, className }: ScrollableWithGradientsProps) {
  const [gradients, setGradients] = useState<ScrollGradients>({ top: false, bottom: false });
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateGradients = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const { scrollTop, scrollHeight, clientHeight } = node;
    const top = scrollTop > 0;
    const bottom = scrollTop + clientHeight < scrollHeight;

    setGradients((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  // Check on mount via ref callback
  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (node) updateGradients();
    },
    [updateGradients]
  );

  return (
    <div className="relative">
      <div ref={setRef} onScroll={updateGradients} className={className}>
        {children}
      </div>
      {gradients.top && (
        <div className="from-default pointer-events-none absolute left-0 right-0 top-0 h-10 bg-gradient-to-b to-transparent" />
      )}
      {gradients.bottom && (
        <div className="from-default pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t to-transparent" />
      )}
    </div>
  );
}

interface EventDescriptionProps {
  htmlContent: string;
}

export function EventDescription({ htmlContent }: EventDescriptionProps) {
  return (
    <ScrollableWithGradients className="wrap-break-word scroll-bar max-h-[180px] max-w-full overflow-y-auto pr-4">
      <div
        dangerouslySetInnerHTML={{
          __html: htmlContent,
        }}
      />
    </ScrollableWithGradients>
  );
}
