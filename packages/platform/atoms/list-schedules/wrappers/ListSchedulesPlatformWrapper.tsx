import { ScheduleListItem } from "@calcom/features/schedules/components/ScheduleListItem";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getScheduleListItemData } from "@calcom/lib/schedules/transformers/getScheduleListItemData";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useAtomDuplicateSchedule } from "../../hooks/schedules/useAtomDuplicateSchedule";
import { useAtomGetAllSchedules } from "../../hooks/schedules/useAtomGetAllSchedules";
import { useAtomUpdateSchedule } from "../../hooks/schedules/useAtomUpdateSchedule";
import useDeleteSchedule from "../../hooks/schedules/useDeleteSchedule";
import { useEnsureDefaultSchedule } from "../../hooks/schedules/useEnsureDefaultSchedule";
import { useMe } from "../../hooks/useMe";
import { useToast } from "../../src/components/ui/use-toast";
import { AtomsWrapper } from "@/components/atoms-wrapper";

interface ListSchedulesPlatformWrapperProps {
  getScheduleUrl?: (scheduleId: number) => string;
}

export const ListSchedulesPlatformWrapper = ({ getScheduleUrl }: ListSchedulesPlatformWrapperProps = {}) => {
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();
  const { toast } = useToast();
  const { t } = useLocale();

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
        description: "Schedule created successfully",
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

  const transformedSchedules = userSchedules?.schedules.map((schedule) => getScheduleListItemData(schedule));

  if (isLoadingSchedules || isUserLoading) return <>{t("loading")}</>;

  if (!isLoadingSchedules && transformedSchedules?.length === 0)
    return (
      <EmptyScreen
        Icon="clock"
        headline={t("no_schedules_present")}
        description={t("create_new_schedule")}
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
              redirectUrl={getScheduleUrl ? getScheduleUrl(schedule.id) : "#"}
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
