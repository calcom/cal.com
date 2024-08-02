import React from "react";

const isInteractionObserverSupported = typeof window !== "undefined" && "IntersectionObserver" in window;

export const useInViewObserver = (
  onInViewCallback: () => void,
  root: Element | Document | null | undefined = document.body
) => {
  const [node, setRef] = React.useState<HTMLElement | null>(null);

  const onInViewCallbackRef = React.useRef(onInViewCallback);
  onInViewCallbackRef.current = onInViewCallback;

  React.useEffect(() => {
    if (!isInteractionObserverSupported) {
      // Skip interaction check if not supported in browser
      return;
    }

    let observer: IntersectionObserver;
    if (node && node.parentElement) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            onInViewCallbackRef.current();
          }
        },
        {
          root,
        }
      );
      observer.observe(node);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [node]);

  return {
    ref: setRef,
  };
};
