"use client";

import { IntervalLimitsManager } from "@calid/features/modules/event-types/components/tabs/event-types-limit";
import { Button } from "@calid/features/ui/components/button";
import { Form, FormField } from "@calid/features/ui/components/form";
import { CheckboxField } from "@calid/features/ui/components/input/checkbox/checkbox-field";
import { SettingsSwitch } from "@calid/features/ui/components/switch/settings-switch";
import { triggerToast } from "@calid/features/ui/components/toast/toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { trpc } from "@calcom/trpc/react";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

interface TeamSettingsViewProps {
  teamId: number;
}

type FormValues = {
  bookingLimits?: IntervalLimit;
  includeManagedEventsInLimits: boolean;
};

export default function TeamSettingsView({ teamId }: TeamSettingsViewProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: team, isLoading, error } = trpc.viewer.teams.get.useQuery({ teamId }, { enabled: !!teamId });

  const bookingLimitsform = useForm<FormValues>({
    defaultValues: {
      bookingLimits: {},
      includeManagedEventsInLimits: false,
    },
  });

  useEffect(() => {
    if (team) {
      bookingLimitsform.reset({
        bookingLimits: team.bookingLimits || {},
        includeManagedEventsInLimits: team.includeManagedEventsInLimits ?? false,
      });
    }
  }, [team, bookingLimitsform]);

  const {
    formState: { isSubmitting: isBookingLimitsSubmitting, isDirty: isBookingLimitsDirty },
    reset: resetBookingLimits,
  } = bookingLimitsform;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => triggerToast(err.message, "error"),
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      if (res) {
        resetBookingLimits({
          bookingLimits: res.bookingLimits,
          includeManagedEventsInLimits: res.includeManagedEventsInLimits,
        });
      }
      if (team?.slug) {
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      triggerToast(t("booking_limits_updated_successfully"), "success");
    },
  });

  const onBookingLimitSubmit = (data: FormValues) => {
    if (!team) return;

    mutation.mutateAsync({
      id: teamId,
      bookingLimits: data.bookingLimits,
      includeManagedEventsInLimits: data.includeManagedEventsInLimits,
    });
  };

  function handleBookingLimitsToggle(
    checked: boolean,
    form: ReturnType<typeof useForm<FormValues>>,
    mutation: ReturnType<typeof trpc.viewer.teams.update.useMutation>,
    teamId: number
  ) {
    if (checked) {
      form.setValue("bookingLimits", {
        PER_DAY: 1,
      });
    } else {
      form.setValue("bookingLimits", {});
      form.setValue("includeManagedEventsInLimits", false);
    }
    mutation.mutate({
      id: teamId,
      bookingLimits: form.getValues("bookingLimits"),
      includeManagedEventsInLimits: form.getValues("includeManagedEventsInLimits"),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="mb-4 text-red-600">Failed to load team data</p>
        </div>
      </div>
    );
  }

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  return (
    <>
      {isAdmin ? (
        <div className="border-subtle space-y-6 rounded-md border p-4">
          <Form {...bookingLimitsform} onSubmit={onBookingLimitSubmit}>
            <FormField
              control={bookingLimitsform.control}
              name="bookingLimits"
              render={({ field }) => {
                const isEnabled = Object.keys(field.value || {}).length > 0;
                return (
                  <SettingsSwitch
                    toggleSwitchAtTheEnd
                    title={t("team_settings_limit_booking_frequency")}
                    description={t("team_settings_limit_booking_frequency_description")}
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      handleBookingLimitsToggle(checked, bookingLimitsform, mutation, teamId);
                    }}
                  />
                );
              }}
            />

            {Object.keys(bookingLimitsform.watch("bookingLimits") || {}).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex flex-col">
                  <FormField
                    control={bookingLimitsform.control}
                    name="includeManagedEventsInLimits"
                    render={({ field: { value, onChange } }) => (
                      <CheckboxField
                        description={t("count_managed_to_limit")}
                        descriptionAsLabel
                        onCheckedChange={onChange}
                        checked={value}
                      />
                    )}
                  />
                  <div className="mt-4">
                    <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    type="submit"
                    loading={isBookingLimitsSubmitting}
                    disabled={!isBookingLimitsDirty}>
                    {t("update")}
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-4">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
}
