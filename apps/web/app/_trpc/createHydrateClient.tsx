"use client";

import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { useMemo } from "react";

type DataTransformer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize: (data: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserialize: (data: any) => any;
};

export function createHydrateClient(opts: { transformer: DataTransformer }) {
  return function HydrateClient(props: { children: React.ReactNode; state: DehydratedState }) {
    const { state, children } = props;

    const transformedState: DehydratedState = useMemo(() => {
      if (opts.transformer) {
        return opts.transformer.deserialize(state);
      }
      return state;
    }, [state]);

    return <HydrationBoundary state={transformedState}>{children}</HydrationBoundary>;
  };
}
