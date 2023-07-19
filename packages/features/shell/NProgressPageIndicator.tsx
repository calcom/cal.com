import { useNProgress } from "@tanem/react-nprogress";
import type { NextRouter } from "next/router";
import type { PropsWithChildren } from "react";
import { useEffect, useState, forwardRef } from "react";

import { classNames } from "@calcom/lib";

interface NProgressOptions {
  isAnimating: boolean;
}

export type NProgressProps = PropsWithChildren<NProgressOptions>;

const NProgress = forwardRef<HTMLDivElement, NProgressProps>(({ isAnimating, ...rest }, ref) => {
  const { animationDuration, isFinished, progress } = useNProgress({
    isAnimating,
  });

  return (
    <div
      {...rest}
      ref={ref}
      className={classNames("fixed left-0 top-0 w-full", isFinished ? "opacity-0" : "opacity-100")}
      style={{
        transition: `opacity ${animationDuration}ms linear`,
      }}>
      <div
        className="bg-brand-emphasis h-0.5 w-full"
        style={{
          marginLeft: `${(-1 + progress) * 100}%`,
          transition: `margin-left ${animationDuration}ms linear`,
        }}
      />
    </div>
  );
});

NProgress.displayName = "NProgress";

export const NProgressNextRouter = ({ router }: { router: NextRouter }) => {
  const [state, setState] = useState({
    isRouteChanging: false,
    loadingKey: 0,
  });

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setState((prevState) => ({
        ...prevState,
        isRouteChanging: true,
        loadingKey: prevState.loadingKey ^ 1,
      }));
    };

    const handleRouteChangeEnd = () => {
      setState((prevState) => ({
        ...prevState,
        isRouteChanging: false,
      }));
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeEnd);
    router.events.on("routeChangeError", handleRouteChangeEnd);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeEnd);
      router.events.off("routeChangeError", handleRouteChangeEnd);
    };
  }, [router.events]);

  const isAnimating = state.isRouteChanging;

  return (
    <>
      <NProgress isAnimating={isAnimating} key={state.loadingKey} />
    </>
  );
};
