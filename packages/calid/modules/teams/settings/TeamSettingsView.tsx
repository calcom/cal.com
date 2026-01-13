"use client";

import type { IntervalLimit } from "@calid/features/lib/intervalLimit";
import { IntervalLimitsManager } from "@calid/features/modules/event-types/components/tabs/event-types-limit";
import { Button } from "@calid/features/ui/components/button";
import { Form, FormField } from "@calid/features/ui/components/form";
import { SettingsSwitch } from "@calid/features/ui/components/switch/settings-switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { revalidateCalIdTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import SkeletonLoader from "../components/SkeletonLoader";

interface TeamSettingsViewProps {
  teamId: number;
}

type FormValues = {
  bookingFrequency?: IntervalLimit;
};

export default function TeamSettingsView({ teamId }: TeamSettingsViewProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();
  const session = useSession();
  const memberId = session?.data?.user?.id as number;

  const {
    data: team,
    isLoading,
    error,
  } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });
  const member_data = trpc.viewer.calidTeams.getMember.useQuery(
    { teamId, memberId: memberId! },
    { enabled: !!memberId }
  );
  const [enableImpersonation, setAllowImpersonation] = useState<boolean | null>(null);
  const [enablePrivateTeam, setEnablePrivateTeam] = useState<boolean | null>(null);

  const bookingFrequencyForm = useForm<FormValues>({
    defaultValues: {
      bookingFrequency: {},
    },
  });

  useEffect(() => {
    if (team) {
      bookingFrequencyForm.reset({
        bookingFrequency: team.bookingFrequency as IntervalLimit,
      });
      setEnablePrivateTeam(team.isTeamPrivate);
    }
    if (member_data.data) {
      setAllowImpersonation(member_data.data.impersonation);
    }
  }, [team, bookingFrequencyForm, member_data.data]);

  const {
    formState: { isSubmitting: isBookingFrequencySubmitting, isDirty: isBookingFrequencyDirty },
    reset: resetBookingFrequency,
  } = bookingFrequencyForm;

  const teamMutation = trpc.viewer.calidTeams.update.useMutation({
    onError: (err) => triggerToast(err.message, "error"),
    async onSuccess(res) {
      await utils.viewer.calidTeams.get.invalidate();
      if (res) {
        resetBookingFrequency({
          bookingFrequency: res.bookingFrequency as IntervalLimit,
        });
      }
      if (team?.slug) {
        revalidateCalIdTeamDataCache({
          teamSlug: team.slug,
        });
      }
      triggerToast(t("team_settings_updated_successfully"), "success");
    },
  });

  const onBookingFrequencySubmit = (data: FormValues) => {
    if (!team) return;

    teamMutation.mutateAsync({
      id: teamId,
      bookingFrequency: data.bookingFrequency,
    });
  };

  function handleBookingFrequencyToggle(
    checked: boolean,
    form: ReturnType<typeof useForm<FormValues>>,
    teamMutation: ReturnType<typeof trpc.viewer.calidTeams.update.useMutation>,
    teamId: number
  ) {
    if (checked) {
      form.setValue("bookingFrequency", {
        PER_DAY: 1,
      });
    } else {
      form.setValue("bookingFrequency", {});
    }
    teamMutation.mutate({
      id: teamId,
      bookingFrequency: form.getValues("bookingFrequency"),
    });
  }

  function handleEnablePrivateTeam(enabled: boolean) {
    if (!team) return;
    setEnablePrivateTeam(enabled);
    teamMutation.mutate({ id: teamId, isTeamPrivate: enabled });
  }

  const updateMembershipMutation = trpc.viewer.calidTeams.updateMember.useMutation({
    onError: (err) => triggerToast(err.message, "error"),
    onSuccess: async () => {
      await utils.viewer.calidTeams.getMember.invalidate({ teamId, memberId });
      triggerToast(t("team_settings_updated_successfully"), "success");
    },
  });

  function handleEnableImpersonation(enabled: boolean) {
    if (!team || !memberId) return;
    setAllowImpersonation(enabled);

    updateMembershipMutation.mutate({
      teamId,
      memberId,
      impersonation: enabled,
    });
  }

  if (isLoading || enableImpersonation === null) {
    return <SkeletonLoader />;
  }

  if (error || !team) {
    router.push("/teams");
  }

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  return (
    <div className="space-y-6">
      <div className="border-default space-y-6 rounded-md border p-4">
        <SettingsSwitch
          toggleSwitchAtTheEnd={true}
          title={t("team_settings_user_impersonation_title")}
          description={t("team_settings_user_impersonation_description")}
          checked={enableImpersonation}
          disabled={enableImpersonation === null}
          onCheckedChange={(enabled) => {
            handleEnableImpersonation(enabled);
          }}
        />
      </div>
      <div className="border-default space-y-6 rounded-md border p-4">
        <SettingsSwitch
          toggleSwitchAtTheEnd={true}
          title={t("team_settings_private_team_title")}
          description={t("team_settings_private_team_description")}
          checked={enablePrivateTeam ?? false}
          disabled={enablePrivateTeam === null || !isAdmin}
          onCheckedChange={(enabled) => {
            handleEnablePrivateTeam(enabled);
          }}
        />
      </div>
      {isAdmin ? (
        <div className="border-default space-y-6 rounded-md border p-4">
          <Form form={bookingFrequencyForm} onSubmit={onBookingFrequencySubmit}>
            <FormField
              control={bookingFrequencyForm.control}
              name="bookingFrequency"
              render={({ field }) => {
                const isEnabled = Object.keys(field.value || {}).length > 0;
                return (
                  <SettingsSwitch
                    toggleSwitchAtTheEnd={true}
                    title={t("team_settings_limit_booking_frequency_title")}
                    description={t("team_settings_limit_booking_frequency_description")}
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      handleBookingFrequencyToggle(checked, bookingFrequencyForm, teamMutation, teamId);
                    }}
                  />
                );
              }}
            />

            {Object.keys(bookingFrequencyForm.watch("bookingFrequency") || {}).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex flex-col">
                  <IntervalLimitsManager propertyName="bookingFrequency" defaultLimit={1} step={1} />
                </div>
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    type="submit"
                    loading={isBookingFrequencySubmitting}
                    disabled={!isBookingFrequencyDirty}>
                    {t("update")}
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-4">
          <span className="text-default text-sm">{t("only_owner_can_change")}</span>
        </div>
      )}
    </div>
  );
}
