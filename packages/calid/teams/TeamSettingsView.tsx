"use client";

import { Button } from "@calid/features/ui";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useForm, Controller, useFieldArray, useFormContext } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { IntervalLimitsManager } from "@calcom/features/eventtypes/components/tabs/limits/EventLimitsTab";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { RRResetInterval, RRTimestampBasis } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Form, Input, SettingsToggle, Select } from "@calcom/ui/components/form";
import { CheckboxField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import { AppearanceSkeletonLoader } from "./AppearanceSkeletonLoader";

type TeamData = RouterOutputs["viewer"]["teams"]["get"];
type PresetFormData = { identifier: number; title: string; reason?: string | undefined };
type FrequencyLimitData = { bookingLimits?: IntervalLimit; includeManagedEventsInLimits: boolean };
type RoundRobinFormData = { rrResetInterval: RRResetInterval; rrTimestampBasis: RRTimestampBasis };

const ALTERNATIVE_FIELD_IDENTIFIER = -1;

const useToastNotification = () => {
  const { t } = useLocale();

  const successMessage = (messageKey: string) => showToast(t(messageKey), "success");
  const errorMessage = (message: string) => showToast(message, "error");

  return { successMessage, errorMessage };
};

const useTeamDataInvalidation = () => {
  const utils = trpc.useUtils();

  const invalidateTeamData = async () => {
    await utils.viewer.teams.get.invalidate();
  };

  return { invalidateTeamData };
};

const usePermissionCheck = (teamInfo: TeamData | null) => {
  const hasAdministrativeRights = teamInfo && checkAdminOrOwner(teamInfo.membership.role);

  return { hasAdministrativeRights };
};

const PermissionDeniedMessage = () => {
  const { t } = useLocale();

  return (
    <div className="border-subtle rounded-md border p-5">
      <span className="text-default text-sm">{t("only_owner_change")}</span>
    </div>
  );
};

function RoundRobinResetInterval() {
  const { t } = useLocale();
  const options = [
    { value: RRResetInterval.DAY, label: t("daily") },
    { value: RRResetInterval.MONTH, label: t("monthly") },
  ];
  const form = useFormContext<RoundRobinFormData>();
  const selected = form.watch("rrResetInterval");
  return (
    <Controller
      name="rrResetInterval"
      render={({ field: { value, onChange } }) => (
        <div className="mt-2 w-52">
          <Select
            options={options}
            value={options.find((opt) => opt.value === value)}
            onChange={(val) => onChange(val?.value)}
          />
        </div>
      )}
    />
  );
}

function RoundRobinTimestampBasis() {
  const { t } = useLocale();
  const options = [
    { value: RRTimestampBasis.CREATED_AT, label: t("booking_creation_time") },
    { value: RRTimestampBasis.START_TIME, label: t("meeting_start_time") },
  ];
  const form = useFormContext<RoundRobinFormData>();
  const selected = form.watch("rrTimestampBasis");
  return (
    <Controller
      name="rrTimestampBasis"
      render={({ field: { value, onChange } }) => (
        <>
          <h4 className="text-emphasis text-sm font-semibold leading-5">
            {t("distribution_basis_weighted_rr")}
          </h4>
          <p className="text-default text-sm leading-tight">{t("timestamp_basis_description")}</p>
          <div className="mt-4 w-52">
            <Select
              options={options}
              value={options.find((opt) => opt.value === value)}
              onChange={(val) => onChange(val?.value)}
            />
          </div>
          {value !== RRTimestampBasis.CREATED_AT && (
            <p className="text-attention mt-2 text-sm">{t("load_balancing_warning")}</p>
          )}
        </>
      )}
    />
  );
}

const RoundRobinConfigurationPanel = ({ team }: { team: TeamData }) => {
  const { t } = useLocale();
  const { hasAdministrativeRights } = usePermissionCheck(team);
  const { invalidateTeamData } = useTeamDataInvalidation();
  const { successMessage, errorMessage } = useToastNotification();

  const currentResetInterval = team?.rrResetInterval ?? undefined;

  const configurationForm = useForm<RoundRobinFormData>({
    defaultValues: {
      rrResetInterval: currentResetInterval ?? RRResetInterval.MONTH,
      rrTimestampBasis: team?.rrTimestampBasis ?? RRTimestampBasis.CREATED_AT,
    },
  });

  const updateConfigurationMutation = trpc.viewer.teams.update.useMutation({
    onError: (error) => errorMessage(error.message),
    async onSuccess() {
      await invalidateTeamData();
      if (team?.slug) {
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      successMessage("round_robin_settings_updated_successfully");
    },
  });

  if (!hasAdministrativeRights) return <PermissionDeniedMessage />;

  const handleFormSubmission = (formData: RoundRobinFormData) => {
    updateConfigurationMutation.mutate({
      id: team.id,
      rrResetInterval: formData.rrResetInterval,
      rrTimestampBasis: formData.rrTimestampBasis,
    });
  };

  return (
    <Form form={configurationForm} handleSubmit={handleFormSubmission}>
      <div className="border-subtle mt-6 space-x-3 rounded-lg border px-4 py-6 pb-0 pb-6 sm:px-6">
        <div>
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <h4 className="text-emphasis text-sm font-semibold leading-5">{t("round_robin")}</h4>
              <p className="text-default text-sm leading-tight">{t("round_robin_settings_description")}</p>
            </div>
            <RoundRobinResetInterval />
          </div>
          <div className="-mx-4 mt-4 sm:-mx-6">
            <div className="px-6 py-6">
              <RoundRobinTimestampBasis />
            </div>
          </div>
        </div>
        <Button type="submit" color="primary" loading={updateConfigurationMutation.isPending}>
          {t("update")}
        </Button>
      </div>
    </Form>
  );
};

const TeamVisibilityToggle = ({
  organizationId,
  visibilityStatus,
  isDisabled,
  isOrganization,
}: {
  organizationId: number;
  visibilityStatus: boolean;
  isDisabled: boolean;
  isOrganization: boolean;
}) => {
  const { t } = useLocale();
  const { invalidateTeamData } = useTeamDataInvalidation();
  const { successMessage, errorMessage } = useToastNotification();

  const visibilityUpdateMutation = trpc.viewer.teams.update.useMutation({
    onError: (error) => errorMessage(error.message),
    async onSuccess() {
      await invalidateTeamData();
      successMessage(isOrganization ? "your_org_updated_successfully" : "your_team_updated_successfully");
    },
  });

  const [currentVisibility, setCurrentVisibility] = useState(visibilityStatus);

  const handleVisibilityChange = (newVisibility: boolean) => {
    setCurrentVisibility(newVisibility);
    visibilityUpdateMutation.mutate({ id: organizationId, isPrivate: newVisibility });
  };

  return (
    <SettingsToggle
      toggleSwitchAtTheEnd={true}
      title={t(isOrganization ? "make_org_private" : "make_team_private")}
      labelClassName="text-sm"
      disabled={isDisabled || visibilityUpdateMutation?.isPending}
      description={t(isOrganization ? "make_org_private_description" : "make_team_private_description")}
      checked={currentVisibility}
      onCheckedChange={handleVisibilityChange}
      switchContainerClassName="my-6"
      data-testid="make-team-private-check"
    />
  );
};

const InternalNotesPresetManager = ({ team }: { team: TeamData }) => {
  const { t } = useLocale();
  const { invalidateTeamData } = useTeamDataInvalidation();
  const { successMessage, errorMessage } = useToastNotification();
  const { hasAdministrativeRights } = usePermissionCheck(team);

  const { data: existingPresets } = trpc.viewer.teams.getInternalNotesPresets.useQuery({
    teamId: team?.id as number,
  });

  const processedPresets = useMemo(() => {
    return (existingPresets ?? []).map((preset) => ({
      ...preset,
      reason: preset.cancellationReason ?? undefined,
    }));
  }, [existingPresets]);

  const hasCurrentPresets = processedPresets.length > 0;

  const presetForm = useForm<{ presets: PresetFormData[] }>({
    values: { presets: processedPresets },
  });

  const {
    fields: presetFields,
    append: addPreset,
    remove: removePreset,
    replace: replaceAll,
  } = useFieldArray({
    control: presetForm.control,
    name: "presets",
  });

  const createNewPreset = () => addPreset({ identifier: ALTERNATIVE_FIELD_IDENTIFIER, title: "" });

  const updatePresetsMutation = trpc.viewer.teams.updateInternalNotesPresets.useMutation({
    onSuccess: () => {
      successMessage("internal_note_presets_updated_successfully");
      trpc.useUtils().viewer.teams.getInternalNotesPresets.invalidate();
    },
    onError: (error) => errorMessage(error.message || t("something_went_wrong")),
  });

  const handlePresetSubmission = async (formData: { presets: PresetFormData[] }) => {
    if (!team?.id) return;

    updatePresetsMutation.mutate({
      teamId: team.id,
      presets: formData.presets.map((preset) => ({
        id: preset.identifier,
        name: preset.title,
        cancellationReason: preset.reason,
      })),
    });
  };

  const [animationReference] = useAutoAnimate<HTMLDivElement>();

  if (!hasAdministrativeRights) return <PermissionDeniedMessage />;

  return (
    <Form form={presetForm} handleSubmit={handlePresetSubmission}>
      <Controller
        name="presets"
        render={({ field: { value } }) => {
          const toggleState = hasCurrentPresets || (value && value.length > 0);

          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName="text-sm"
              title={t("internal_note_presets")}
              description={t("internal_note_presets_description")}
              checked={toggleState}
              childrenClassName="lg:ml-0"
              onCheckedChange={async (isActive) => {
                if (isActive && !value?.length) {
                  addPreset({ identifier: ALTERNATIVE_FIELD_IDENTIFIER, title: "" });
                } else {
                  replaceAll([]);
                  if (!isActive && team?.id && hasCurrentPresets) {
                    updatePresetsMutation.mutate({ teamId: team.id, presets: [] });
                  }
                }
              }}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                toggleState && "rounded-b-none"
              )}>
              <div className="border-subtle border border-y-0 p-6">
                <div className="flex flex-col space-y-4" ref={animationReference}>
                  {presetFields.map((fieldItem, fieldIndex) => (
                    <div key={fieldItem.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Controller
                          name={`presets.${fieldIndex}.title`}
                          control={presetForm.control}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              placeholder={t("internal_booking_note")}
                              className="!mb-0"
                            />
                          )}
                        />
                        <Button
                          type="button"
                          color="destructive"
                          variant="icon"
                          onClick={() => removePreset(fieldIndex)}
                          disabled={presetFields.length === 1}>
                          <Icon name="trash" className="h-4 w-5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="corner-down-right" className="h-4 w-4" />
                        <Controller
                          name={`presets.${fieldIndex}.reason`}
                          control={presetForm.control}
                          render={({ field }) => (
                            <Input
                              type="text"
                              {...field}
                              placeholder={t("internal_note_cancellation_reason")}
                              className="!mb-0"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  color="minimal"
                  StartIcon="plus"
                  onClick={createNewPreset}
                  className="mt-4">
                  {t("add_preset")}
                </Button>
              </div>
              <SectionBottomActions align="end">
                <Button type="submit" color="primary" loading={updatePresetsMutation.isPending}>
                  {t("update")}
                </Button>
              </SectionBottomActions>
            </SettingsToggle>
          );
        }}
      />
    </Form>
  );
};

const ImpersonationController = ({
  organizationId,
  userId,
  isDisabled,
}: {
  organizationId: number;
  userId: number;
  isDisabled: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const membershipQuery = trpc.viewer.teams.getMembershipbyUser.useQuery({
    teamId: organizationId,
    memberId: userId,
  });

  const membershipUpdateMutation = trpc.viewer.teams.updateMembership.useMutation({
    onSuccess: async () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      await utils.viewer.teams.getMembershipbyUser.invalidate();
    },
  });

  const [impersonationAllowed, setImpersonationAllowed] = useState(
    membershipQuery.data ? !membershipQuery.data.disableImpersonation : true
  );

  if (membershipQuery.isPending) return <></>;

  const handleImpersonationToggle = (allowedStatus: boolean) => {
    setImpersonationAllowed(allowedStatus);
    membershipUpdateMutation.mutate({
      teamId: organizationId,
      memberId: userId,
      disableImpersonation: !allowedStatus,
    });
  };

  return (
    <SettingsToggle
      toggleSwitchAtTheEnd={true}
      title={t("user_impersonation_heading")}
      labelClassName="text-sm"
      disabled={isDisabled || membershipUpdateMutation?.isPending}
      description={t("team_impersonation_description")}
      checked={impersonationAllowed}
      onCheckedChange={handleImpersonationToggle}
    />
  );
};

const FrequencyLimitManager = ({ team }: { team: TeamData }) => {
  const { t } = useLocale();
  const { invalidateTeamData } = useTeamDataInvalidation();
  const { successMessage, errorMessage } = useToastNotification();
  const { hasAdministrativeRights } = usePermissionCheck(team);

  const limitForm = useForm<FrequencyLimitData>({
    defaultValues: {
      bookingLimits: team?.bookingLimits || undefined,
      includeManagedEventsInLimits: team?.includeManagedEventsInLimits ?? false,
    },
  });

  const {
    formState: { isSubmitting, isDirty },
    reset: resetForm,
  } = limitForm;

  const limitUpdateMutation = trpc.viewer.teams.update.useMutation({
    onError: (error) => errorMessage(error.message),
    async onSuccess(response) {
      await invalidateTeamData();
      if (response) {
        resetForm({
          bookingLimits: response.bookingLimits,
          includeManagedEventsInLimits: response.includeManagedEventsInLimits,
        });
      }
      if (team?.slug) {
        revalidateTeamDataCache({
          teamSlug: team.slug,
          orgSlug: team.parent?.slug ?? null,
        });
      }
      successMessage("booking_limits_updated_successfully");
    },
  });

  const handleLimitSubmission = (formData: FrequencyLimitData) => {
    if (formData.bookingLimits) {
      const validationResult = validateIntervalLimitOrder(formData.bookingLimits);
      if (!validationResult) {
        resetForm();
        throw new Error(t("event_setup_booking_limits_error"));
      }
    }
    limitUpdateMutation.mutate({ ...formData, id: team.id });
  };

  if (!hasAdministrativeRights) return <PermissionDeniedMessage />;

  return (
    <Form form={limitForm} handleSubmit={handleLimitSubmission}>
      <Controller
        name="bookingLimits"
        render={({ field: { value } }) => {
          const limitActive = Object.keys(value ?? {}).length > 0;

          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName="text-sm"
              title={t("limit_booking_frequency")}
              description={t("limit_team_booking_frequency_description")}
              checked={limitActive}
              onCheckedChange={(isActive) => {
                if (isActive) {
                  limitForm.setValue("bookingLimits", { PER_DAY: 1 });
                } else {
                  limitForm.setValue("bookingLimits", {});
                  limitForm.setValue("includeManagedEventsInLimits", false);
                }

                const currentLimits = limitForm.getValues("bookingLimits");
                const includeManagedEvents = limitForm.getValues("includeManagedEventsInLimits");

                limitUpdateMutation.mutate({
                  bookingLimits: currentLimits,
                  includeManagedEventsInLimits: includeManagedEvents,
                  id: team.id,
                });
              }}
              switchContainerClassName={classNames(
                "mt-6 rounded-md border pt-4 px-4 sm:px-6 pb-4",
                limitActive && "rounded-b-none border-b-0"
              )}
              childrenClassName="lg:ml-0">
              <div className="border-subtle rounded-md rounded-t-none border border-t-0 p-6">
                <Controller
                  name="includeManagedEventsInLimits"
                  render={({ field: { value, onChange } }) => (
                    <CheckboxField
                      description={t("count_managed_to_limit")}
                      descriptionAsLabel
                      onChange={onChange}
                      checked={value}
                    />
                  )}
                />
                <div className="pt-6">
                  <IntervalLimitsManager
                    propertyName="bookingLimits"
                    defaultLimit={1}
                    step={1}
                    extraButton={
                      <Button disabled={isSubmitting || !isDirty} type="submit" color="primary">
                        {t("update")}
                      </Button>
                    }
                  />
                </div>
              </div>
            </SettingsToggle>
          );
        }}
      />
    </Form>
  );
};

const SecurityAndPrivacyPanel = ({ team }: { team: TeamData }) => {
  const sessionData = useSession();
  const { hasAdministrativeRights } = usePermissionCheck(team);
  const hasOrgPermissions = checkAdminOrOwner(sessionData?.data?.user.org?.role);
  const pendingInvitation = !team?.membership.accepted;

  return (
    <div className="mt-6">
      {team && sessionData.data && (
        <ImpersonationController
          organizationId={team.id}
          userId={sessionData.data.user.id}
          isDisabled={pendingInvitation}
        />
      )}

      {team && team.id && (hasAdministrativeRights || hasOrgPermissions) && (
        <TeamVisibilityToggle
          isOrganization={false}
          organizationId={team.id}
          visibilityStatus={team.isPrivate ?? false}
          isDisabled={pendingInvitation}
        />
      )}
    </div>
  );
};

const TeamSettingsViewWrapper = () => {
  const navigationRouter = useRouter();
  const routeParameters = useParamsWithFallback();

  const {
    data: teamInformation,
    isPending: loadingTeamData,
    error: teamLoadError,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(routeParameters.id) },
    { enabled: !!Number(routeParameters.id) }
  );

  useEffect(() => {
    if (teamLoadError) {
      navigationRouter.replace("/teams");
    }
  }, [teamLoadError, navigationRouter]);

  if (loadingTeamData) return <AppearanceSkeletonLoader />;
  if (!teamInformation) return null;

  return (
    <>
      <FrequencyLimitManager team={teamInformation} />
      <SecurityAndPrivacyPanel team={teamInformation} />
      <InternalNotesPresetManager team={teamInformation} />
      <RoundRobinConfigurationPanel team={teamInformation} />
    </>
  );
};

export default TeamSettingsViewWrapper;
