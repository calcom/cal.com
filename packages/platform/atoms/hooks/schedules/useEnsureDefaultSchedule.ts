import { useEffect, useRef } from "react";

import { Schedule } from "@calcom/lib/schedules/transformers/getTransformedSchedles";

export function useEnsureDefaultSchedule(
  schedules: Schedule[],
  onUpdateSchedule: (scheduleId: number) => void | Promise<void>
) {
  const onUpdateRef = useRef(onUpdateSchedule);

  useEffect(() => {
    onUpdateRef.current = onUpdateSchedule;
  });

  useEffect(() => {
    const defaultSchedule = schedules.filter((schedule) => schedule.isDefault);

    if (defaultSchedule.length === 0 && schedules.length > 0) {
      onUpdateRef.current(schedules[0].id);
    }
  }, [schedules]);
}
