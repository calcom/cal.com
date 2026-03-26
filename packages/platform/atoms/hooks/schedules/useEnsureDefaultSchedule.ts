import type { Schedule } from "@calcom/lib/schedules/transformers/getScheduleListItemData";
import { useEffect, useRef } from "react";

export function useEnsureDefaultSchedule(
  schedules: Schedule[],
  onUpdateSchedule: (scheduleId: number) => void | Promise<void>
): void {
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
