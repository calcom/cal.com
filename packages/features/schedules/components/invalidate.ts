import { type RouterContext } from "@calcom/trpc/react";

export async function invalidateSchedules(
  utils: RouterContext,
  prevDefaultId: number | null | undefined,
  currentDefaultId: number | null | undefined,
  data: { schedule: { id: number } }
) {
  if (prevDefaultId && currentDefaultId) {
    // check weather the default schedule has been changed by comparing  previous default schedule id and current default schedule id.
    if (prevDefaultId !== currentDefaultId) {
      // if not equal, invalidate previous default schedule id and refetch previous default schedule id.
      utils.viewer.availability.schedule.get.invalidate({ scheduleId: prevDefaultId });
      utils.viewer.availability.schedule.get.refetch({ scheduleId: prevDefaultId });
    }
  }

  utils.viewer.availability.schedule.get.invalidate({ scheduleId: data.schedule.id });
  utils.viewer.availability.list.invalidate();
}
