"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import SkeletonLoader from "@calcom/features/availability/components/SkeletonLoader";
import { BulkEditDefaultForEventsModal } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import type { BulkUpdatParams } from "@calcom/features/eventtypes/components/BulkEditDefaultForEventsModal";
import { NewScheduleButton, ScheduleListItem } from "@calcom/features/schedules";
import Shell from "@calcom/features/shell/Shell";
import { AvailabilitySliderTable } from "@calcom/features/timezone-buddy/components/AvailabilitySliderTable";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import type { OrganizationRepository } from "@calcom/lib/server/repository/organization";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { EmptyScreen, showToast, ToggleGroup } from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

export function AvailabilityList({ schedules }: RouterOutputs["viewer"]["availability"]["list"]) {
  const { t } = useLocale();
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false);
  const utils = trpc.useUtils();

  const meQuery = trpc.viewer.me.useQuery();

  const router = useRouter();

  const deleteMutation = trpc.viewer.availability.schedule.delete.useMutation({
    onMutate: async ({ scheduleId }) => {
      await utils.viewer.availability.list.cancel();
      const previousValue = utils.viewer.availability.list.getData();
      if (previousValue) {
        const filteredValue = previousValue.schedules.filter(({ id }) => id !== scheduleId);
        utils.viewer.availability.list.setData(undefined, { ...previousValue, schedules: filteredValue });
      }

      return { previousValue };
    },

    onError: (err, variables, context) => {
      if (context?.previousValue) {
        utils.viewer.availability.list.setData(undefined, context.previousValue);
      }
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
    },
  });

  const updateMutation = trpc.viewer.availability.schedule.update.useMutation({
    onSuccess: async ({ schedule }) => {
      await utils.viewer.availability.list.invalidate();
      showToast(
        t("availability_updated_successfully", {
          scheduleName: schedule.name,
        }),
        "success"
      );
      setBulkUpdateModal(true);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  const bulkUpdateDefaultAvailabilityMutation =
    trpc.viewer.availability.schedule.bulkUpdateToDefaultAvailability.useMutation();

  const { data: eventTypesQueryData, isFetching: isEventTypesFetching } =
    trpc.viewer.eventTypes.bulkEventFetch.useQuery();

  const bulkUpdateFunction = ({ eventTypeIds, callback }: BulkUpdatParams) => {
    bulkUpdateDefaultAvailabilityMutation.mutate(
      {
        eventTypeIds,
      },
      {
        onSuccess: () => {
          utils.viewer.availability.list.invalidate();
          showToast(t("success"), "success");
          callback();
        },
      }
    );
  };

  const handleBulkEditDialogToggle = () => {
    utils.viewer.getUsersDefaultConferencingApp.invalidate();
  };

  const duplicateMutation = trpc.viewer.availability.schedule.duplicate.useMutation({
    onSuccess: async ({ schedule }) => {
      await router.push(`/availability/${schedule.id}`);
      showToast(t("schedule_created_successfully", { scheduleName: schedule.name }), "success");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  // Adds smooth delete button - item fades and old item slides into place

  const [animationParentRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <>
      {schedules.length === 0 ? (
        <div className="flex justify-center">
          <EmptyScreen
            Icon="clock"
            headline={t("new_schedule_heading")}
            description={t("new_schedule_description")}
            className="w-full"
            buttonRaw={<NewScheduleButton />}
          />
        </div>
      ) : (
        <>
          <div className="border-subtle bg-default overflow-hidden rounded-md border">
            <ul className="divide-subtle divide-y" data-testid="schedules" ref={animationParentRef}>
              {schedules.map((schedule) => (
                <ScheduleListItem
                  displayOptions={{
                    hour12: meQuery.data?.timeFormat ? meQuery.data.timeFormat === 12 : undefined,
                    timeZone: meQuery.data?.timeZone,
                    weekStart: meQuery.data?.weekStart || "Sunday",
                  }}
                  key={schedule.id}
                  schedule={schedule}
                  isDeletable={schedules.length !== 1}
                  updateDefault={updateMutation.mutate}
                  deleteFunction={deleteMutation.mutate}
                  duplicateFunction={duplicateMutation.mutate}
                />
              ))}
            </ul>
          </div>
          <div className="text-default mb-16 mt-4 hidden text-center text-sm md:block">
            {t("temporarily_out_of_office")}{" "}
            <Link href="settings/my-account/out-of-office" className="underline">
              {t("add_a_redirect")}
            </Link>
          </div>
          {bulkUpdateModal && (
            <BulkEditDefaultForEventsModal
              isPending={bulkUpdateDefaultAvailabilityMutation.isPending}
              open={bulkUpdateModal}
              setOpen={setBulkUpdateModal}
              bulkUpdateFunction={bulkUpdateFunction}
              description={t("default_schedules_bulk_description")}
              eventTypes={eventTypesQueryData?.eventTypes}
              isEventTypesFetching={isEventTypesFetching}
              handleBulkEditDialogToggle={handleBulkEditDialogToggle}
            />
          )}
        </>
      )}
    </>
  );
}

function AvailabilityListWithQuery() {
  const query = trpc.viewer.availability.list.useQuery();

  return (
    <QueryCell
      query={query}
      success={({ data }) => <AvailabilityList {...data} />}
      customLoader={<SkeletonLoader />}
    />
  );
}

type PageProps = {
  currentOrg?: Awaited<ReturnType<typeof OrganizationRepository.findCurrentOrg>> | null;
};

export default function AvailabilityPage({ currentOrg }: PageProps) {
  const { t } = useLocale();
  const searchParams = useCompatSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMeQuery();
  const { data: _data } = trpc.viewer.organizations.listCurrent.useQuery(undefined, { enabled: !currentOrg });
  const data = currentOrg ?? _data;

  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams ?? undefined);
      params.set(name, value);

      return params.toString();
    },
    [searchParams]
  );

  const isOrg = Boolean(data);
  const isOrgAdminOrOwner =
    (data && (data.user.role === MembershipRole.OWNER || data.user.role === MembershipRole.ADMIN)) ?? false;
  const isOrgAndPrivate = data?.isOrganization && data.isPrivate;

  const canViewTeamAvailability = isOrgAdminOrOwner || !isOrgAndPrivate;

  const toggleGroupOptions = [{ value: "mine", label: t("my_availability") }];

  if (canViewTeamAvailability) {
    toggleGroupOptions.push({ value: "team", label: t("team_availability") });
  }

  return (
    <div>
      <Shell
        heading={t("availability")}
        subtitle={t("configure_availability")}
        title={t("availability")}
        description={t("configure_availability")}
        hideHeadingOnMobile
        withoutMain={false}
        CTA={
          <div className="flex gap-2">
            <ToggleGroup
              className="hidden md:block"
              defaultValue={searchParams?.get("type") ?? "mine"}
              onValueChange={(value) => {
                if (!value) return;
                router.push(`${pathname}?${createQueryString("type", value)}`);
              }}
              options={toggleGroupOptions}
            />
            <NewScheduleButton />
          </div>
        }>
        {searchParams?.get("type") === "team" && canViewTeamAvailability ? (
          <AvailabilitySliderTable userTimeFormat={me?.data?.timeFormat ?? null} isOrg={isOrg} />
        ) : (
          <AvailabilityListWithQuery />
        )}
      </Shell>
    </div>
  );
}
