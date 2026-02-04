"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { AppearanceSkeletonLoader } from "~/ee/common/components/CommonSkeletonLoaders";
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
import { SettingsToggle } from "@calcom/ui/components/form";
import { CheckboxField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";

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
          <div className="mt-6">
            <MakeTeamPrivateSwitch
              isOrg={false}
              teamId={team.id}
              isPrivate={team.isPrivate ?? false}
              disabled={isInviteOpen}
            />
          </div>
        )}
      </div>
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
      <InternalNotePresetsView team={team} />
      <RoundRobinSettings team={team} />
    </>
  );
};

export default TeamSettingsViewWrapper;
