"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { AppearanceSkeletonLoader } from "@calcom/features/ee/components/CommonSkeletonLoaders";
import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { SettingsToggle, Select } from "@calcom/ui/components/form";
import { CheckboxField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import { default as InternalNotePresetsView } from "../components/InternalNotePresetsView";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import RoundRobinSettings from "../components/RoundRobinSettings";

type ProfileViewProps = { team: RouterOutputs["viewer"]["teams"]["get"] };

const BookingLimitsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const form = useForm<{ bookingLimits?: IntervalLimit; includeManagedEventsInLimits: boolean }>({
    defaultValues: {
      bookingLimits: team?.bookingLimits || undefined,
      includeManagedEventsInLimits: team?.includeManagedEventsInLimits ?? false,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = form;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      if (res) {
        reset({
          bookingLimits: res.bookingLimits,
          includeManagedEventsInLimits: res.includeManagedEventsInLimits,
        });
      }
      if (team?.slug) {
        // Booking limits are enforced during slot generation, which relies on the same cached team data.
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      showToast(t("booking_limits_updated_successfully"), "success");
    },
  });

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  return (
    <>
      {isAdmin ? (
        <>
          <Form
            form={form}
            handleSubmit={(values) => {
              if (values.bookingLimits) {
                const isValid = validateIntervalLimitOrder(values.bookingLimits);
                if (!isValid) {
                  reset();
                  throw new Error(t("event_setup_booking_limits_error"));
                }
              }
              mutation.mutate({ ...values, id: team.id });
            }}>
            <Controller
              name="bookingLimits"
              render={({ field: { value } }) => {
                const isChecked = Object.keys(value ?? {}).length > 0;
                return (
                  <SettingsToggle
                    toggleSwitchAtTheEnd={true}
                    labelClassName="text-sm"
                    title={t("limit_booking_frequency")}
                    description={t("limit_team_booking_frequency_description")}
                    checked={isChecked}
                    onCheckedChange={(active) => {
                      if (active) {
                        form.setValue("bookingLimits", {
                          PER_DAY: 1,
                        });
                      } else {
                        form.setValue("bookingLimits", {});
                        form.setValue("includeManagedEventsInLimits", false);
                      }
                      const bookingLimits = form.getValues("bookingLimits");
                      const includeManagedEventsInLimits = form.getValues("includeManagedEventsInLimits");

                      mutation.mutate({ bookingLimits, includeManagedEventsInLimits, id: team.id });
                    }}
                    switchContainerClassName={classNames(
                      "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                      isChecked && "rounded-b-none"
                    )}
                    childrenClassName="lg:ml-0">
                    <div className="border-subtle border border-y-0 p-6">
                      <Controller
                        name="includeManagedEventsInLimits"
                        render={({ field: { value, onChange } }) => (
                          <CheckboxField
                            description={t("count_managed_to_limit")}
                            descriptionAsLabel
                            onChange={(e) => onChange(e)}
                            checked={value}
                          />
                        )}
                      />

                      <div className="pt-6">
                        <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
                      </div>
                    </div>
                    <SectionBottomActions className="mb-6" align="end">
                      <Button disabled={isSubmitting || !isDirty} type="submit" color="primary">
                        {t("update")}
                      </Button>
                    </SectionBottomActions>
                  </SettingsToggle>
                );
              }}
            />
          </Form>
        </>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const PrivacySettingsView = ({ team }: ProfileViewProps) => {
  const session = useSession();
  const isAdmin = team && checkAdminOrOwner(team.membership.role);
  const isOrgAdminOrOwner = checkAdminOrOwner(session?.data?.user.org?.role);
  const isInviteOpen = !team?.membership.accepted;
  const { t } = useLocale();

  return (
    <>
      <div className="mt-6">
        {team && session.data && (
          <DisableTeamImpersonation
            teamId={team.id}
            memberId={session.data.user.id}
            disabled={isInviteOpen}
          />
        )}

        {team && team.id && (isAdmin || isOrgAdminOrOwner) && (
          <MakeTeamPrivateSwitch
            isOrg={false}
            teamId={team.id}
            isPrivate={team.isPrivate ?? false}
            disabled={isInviteOpen}
          />
        )}
      </div>
    </>
  );
};

const CancellationReasonSettingsView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Define the 4 options for cancellation reason settings
  const cancellationReasonOptions = [
    { value: "both", label: t("mandatory_for_both") },
    { value: "host", label: t("mandatory_for_host_only") },
    { value: "attendee", label: t("mandatory_for_attendee_only") },
    { value: "none", label: t("optional_for_both") },
  ];

  // Determine current value based on team settings
  const getCurrentValue = () => {
    const hostMandatory = team?.mandatoryCancellationReasonForHost ?? true; // Default to true for host
    const attendeeMandatory = team?.mandatoryCancellationReasonForAttendee ?? false;

    if (hostMandatory && attendeeMandatory) return "both";
    if (hostMandatory && !attendeeMandatory) return "host";
    if (!hostMandatory && attendeeMandatory) return "attendee";
    return "none";
  };

  const [selectedValue, setSelectedValue] = useState(getCurrentValue());

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("cancellation_reason_settings_updated_successfully"), "success");
    },
  });

  const handleValueChange = (value: string) => {
    setSelectedValue(value);

    let hostMandatory = false;
    let attendeeMandatory = false;

    switch (value) {
      case "both":
        hostMandatory = true;
        attendeeMandatory = true;
        break;
      case "host":
        hostMandatory = true;
        attendeeMandatory = false;
        break;
      case "attendee":
        hostMandatory = false;
        attendeeMandatory = true;
        break;
      case "none":
        hostMandatory = false;
        attendeeMandatory = false;
        break;
    }

    mutation.mutate({
      id: team.id,
      mandatoryCancellationReasonForHost: hostMandatory,
      mandatoryCancellationReasonForAttendee: attendeeMandatory,
    });
  };

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  return (
    <>
      {isAdmin ? (
        <div className="border-subtle mt-6 rounded-md border p-5">
          <div className="space-y-2">
            <label className="text-emphasis text-sm font-medium">
              {t("cancellation_reason_requirements")}
            </label>
            <p className="text-subtle text-sm">{t("cancellation_reason_requirements_description")}</p>
            <Select
              value={cancellationReasonOptions.find((option) => option.value === selectedValue)}
              onChange={(option) => option && handleValueChange(option.value)}
              options={cancellationReasonOptions}
              isDisabled={mutation?.isPending}
              data-testid="cancellation-reason-dropdown"
              className="border-default"
            />
          </div>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const TeamSettingsViewWrapper = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(params.id) },
    {
      enabled: !!Number(params.id),
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  if (isPending) return <AppearanceSkeletonLoader />;

  if (!team) return null;

  return (
    <>
      <BookingLimitsView team={team} />
      <PrivacySettingsView team={team} />
      <CancellationReasonSettingsView team={team} />
      <InternalNotePresetsView team={team} />
      <RoundRobinSettings team={team} />
    </>
  );
};

export default TeamSettingsViewWrapper;
