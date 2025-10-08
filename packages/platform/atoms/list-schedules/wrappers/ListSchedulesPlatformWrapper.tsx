import { AtomsWrapper } from "@/components/atoms-wrapper";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { ScheduleListItem } from "@calcom/features/schedules/components/ScheduleListItem";
import { getTransformedSchedules } from "@calcom/lib/schedules/transformers/getTransformedSchedles";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

import { useAtomDuplicateSchedule } from "../../hooks/schedules/useAtomDuplicateSchedule";
import { useAtomGetAllSchedules } from "../../hooks/schedules/useAtomGetAllSchedules";
import { useAtomUpdateSchedule } from "../../hooks/schedules/useAtomUpdateSchedule";
import useDeleteSchedule from "../../hooks/schedules/useDeleteSchedule";
import { useEnsureDefaultSchedule } from "../../hooks/schedules/useEnsureDefaultSchedule";
import { useMe } from "../../hooks/useMe";
import { useToast } from "../../src/components/ui/use-toast";

interface ListSchedulesPlatformWrapperProps {
  getRedirectUrl?: (scheduleId: number) => string;
}

export const ListSchedulesPlatformWrapper = ({ getRedirectUrl }: ListSchedulesPlatformWrapperProps = {}) => {
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();
  const { toast } = useToast();

  const {
    data: userSchedules,
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useAtomGetAllSchedules();
  const { data: user, isLoading: isUserLoading } = useMe();

  const { mutate: updateSchedule } = useAtomUpdateSchedule({
    onSuccess: () => {
      toast({
        description: "Schedule updated successfully",
      });
      refetchSchedules();
    },
    onError: (err) => {
      toast({
        description: `Could not update schedule: ${err.error.message}`,
      });
    },
  });

  const { mutate: duplicateSchedule } = useAtomDuplicateSchedule({
    onSuccess: () => {
      toast({
        description: "Schedule updated successfully",
      });
      refetchSchedules();
    },
    onError: (err) => {
      toast({
        description: `Could not duplicate schedule: ${err.error.message}`,
      });
    },
  });

  const { mutate: deleteSchedule } = useDeleteSchedule({
    onSuccess: () => {
      toast({
        description: "Schedule deleted successfully",
      });
      refetchSchedules();
    },
    onError: (err) => {
      toast({
        description: `Could not delete schedule: ${err.error.message}`,
      });
    },
  });

  useEnsureDefaultSchedule(userSchedules?.schedules ?? [], (id) => {
    updateSchedule({
      scheduleId: id,
      body: {
        isDefault: true,
      },
    });
  });

  const transformedSchedules = getTransformedSchedules(userSchedules?.schedules ?? []);

  if (isLoadingSchedules || isUserLoading) return <>Loading...</>;

  if (!isLoadingSchedules && transformedSchedules?.length === 0)
    return (
      <EmptyScreen
        Icon="clock"
        headline="No schedules present"
        description="Create a new schedule to get started"
        className="w-full"
      />
    );

  return (
    <AtomsWrapper>
      <div className="border-subtle bg-default overflow-hidden rounded-md border">
        <ul className="divide-subtle divide-y" data-testid="schedules" ref={animationParentRef}>
          {transformedSchedules?.map((schedule) => (
            <ScheduleListItem
              displayOptions={{
                hour12: user?.data.timeFormat ? user.data.timeFormat === 12 : undefined,
                timeZone: user?.data.timeZone,
                weekStart: user?.data.weekStart || "Sunday",
              }}
              key={schedule.id}
              schedule={schedule}
              isDeletable={transformedSchedules.length !== 1}
              redirectUrl={getRedirectUrl ? getRedirectUrl(schedule.id) : ""}
              updateDefault={() => {
                updateSchedule({
                  scheduleId: schedule.id,
                  body: {
                    isDefault: true,
                  },
                });
              }}
              deleteFunction={async () => await deleteSchedule({ id: schedule.id })}
              duplicateFunction={() => duplicateSchedule({ scheduleId: schedule.id })}
            />
          ))}
        </ul>
      </div>
    </AtomsWrapper>
  );
};
