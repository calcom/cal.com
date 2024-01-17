import { AvailabilitySettings } from "availability/settings";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { showToast } from "@calcom/ui";

type AvailabilitySettingsWrapperProps = {
  id?: string;
};

export const AvailabilitySettingsWrapper = ({ id }: AvailabilitySettingsWrapperProps) => {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const me = useMeQuery();
  const scheduleId = searchParams?.get("schedule") ? Number(searchParams.get("schedule")) : -1;
  const fromEventType = searchParams?.get("fromEventType");
  const { timeFormat } = me.data || { timeFormat: null };
  const [openSidebar, setOpenSidebar] = useState(false);
  const { data: schedule, isLoading } = trpc.viewer.availability.schedule.get.useQuery(
    { scheduleId },
    {
      enabled: !!scheduleId,
    }
  );

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ prevDefaultId, currentDefaultId, ...data }) => {
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
      showToast(
        t("availability_updated_successfully", {
          scheduleName: data.schedule.name,
        }),
        "success"
      );
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
    onSettled: () => {
      utils.viewer.availability.list.invalidate();
    },
    onSuccess: () => {
      showToast(t("schedule_deleted_successfully"), "success");
      router.push("/availability");
    },
  });

  return schedule?.id ? (
    <AvailabilitySettings
      id=""
      schedule={{
        name: schedule.name,
        id: schedule.id,
        availability: schedule.availability || [],
        isLastSchedule: schedule.isLastSchedule,
        isDefault: schedule.isDefault,
        workingHours: schedule.workingHours,
        dateOverrides: schedule.dateOverrides,
        timeZone: schedule.timeZone,
      }}
      handleDelete={() => {
        deleteMutation.mutate({ scheduleId: schedule.id });
      }}
      handleSubmit={async ({ dateOverrides, ...values }) => {
        updateMutation.mutate({
          scheduleId,
          dateOverrides: dateOverrides.flatMap((override) => override.ranges),
          ...values,
        });
      }}
      isDeleting={deleteMutation.isLoading}
      isLoading={isLoading}
      timeFormat={timeFormat ?? 12}
      weekStart={0}
    />
  ) : (
    <></>
  );
};
