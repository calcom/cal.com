import React, { useEffect } from "react";

import { useSchedulerStore } from "../state/store";
import { SchedulerComponentProps } from "../types/state";

export function Scheduler(props: SchedulerComponentProps) {
  const initalState = useSchedulerStore((state) => state.initState);

  // TESTING PURPOSES ONLY
  const state = useSchedulerStore();

  useEffect(() => {
    initalState(props);
  }, [props, initalState]);

  return <div>{JSON.stringify(state)}</div>;
}
