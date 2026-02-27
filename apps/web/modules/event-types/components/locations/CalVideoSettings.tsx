import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type {
  CalVideoSettings as CalVideoSettingsType,
  FormValues,
} from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { InfoBadge } from "@calcom/ui/components/badge";
import { SettingsToggle, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { UpgradeTeamsBadgeWebWrapper as UpgradeTeamsBadge } from "@calcom/web/modules/billing/components/UpgradeTeamsBadgeWebWrapper";
import { useHasTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";
import LocationSettingsContainer from "@calcom/web/modules/event-types/components/locations/LocationSettingsContainer";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ErrorMessage } from "@hookform/error-message";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

const CalVideoSettings = ({ calVideoSettings }: { calVideoSettings?: CalVideoSettingsType }) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();
  const [isExpanded, setIsExpanded] = useState(false);
  const [parent] = useAutoAnimate<HTMLDivElement>();
  const { hasTeamPlan } = useHasTeamPlan();
  return (
    <>
      <Tooltip content="expandable" side="right" className="lg:hidden">
        <button
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className={classNames(
            "cursor-pointer todesktop:py-[7px] text-default group flex w-full items-center rounded-md px-2 pt-1.5 text-sm font-medium transition",
            "[&[aria-current='page']]:!bg-transparent",
            "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm"
          )}>
          <span className="hidden w-full justify-between truncate text-ellipsis lg:flex">
            {!isExpanded ? t("show_advanced_settings") : t("hide_advanced_settings")}
          </span>
          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} className="ml-auto h-4 w-4" />
        </button>
      </Tooltip>
      <div ref={parent}>
        {isExpanded && (
          <LocationSettingsContainer>
            <Controller
              name="calVideoSettings.disableRecordingForGuests"
              defaultValue={!!calVideoSettings?.disableRecordingForGuests}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("disable_recording_for_guests")}
                    description={t("disable_recording_for_guests_description")}
                    labelClassName="text-sm leading-6 whitespace-normal wrap-break-word"
                    checked={value}
                    disabled={!hasTeamPlan}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            <Controller
              name="calVideoSettings.disableRecordingForOrganizer"
              defaultValue={!!calVideoSettings?.disableRecordingForOrganizer}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("disable_recording_for_organizer")}
                    description={t("disable_recording_for_organizer_description")}
                    labelClassName="text-sm leading-6 whitespace-normal wrap-break-word"
                    checked={value}
                    disabled={!hasTeamPlan}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            {!isPlatform && (
              <Controller
                name="calVideoSettings.enableAutomaticRecordingForOrganizer"
                defaultValue={!!calVideoSettings?.enableAutomaticRecordingForOrganizer}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("enable_automatic_recording")}
                      description={t("enable_automatic_recording_description")}
                      labelClassName="text-sm"
                      checked={value}
                      disabled={!hasTeamPlan}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            <Controller
              name="calVideoSettings.enableAutomaticTranscription"
              defaultValue={!!calVideoSettings?.enableAutomaticTranscription}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("enable_automatic_transcription")}
                    description={t("enable_automatic_transcription_description")}
                    labelClassName="text-sm leading-6 whitespace-normal wrap-break-word"
                    checked={value}
                    disabled={!hasTeamPlan}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            {!isPlatform && (
              <Controller
                name="calVideoSettings.disableTranscriptionForGuests"
                defaultValue={!!calVideoSettings?.disableTranscriptionForGuests}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("disable_transcription_for_guests")}
                      description={t("disable_transcription_for_guests_description")}
                      labelClassName="text-sm leading-6 whitespace-normal wrap-break-word"
                      checked={value}
                      disabled={!hasTeamPlan}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}
            {!isPlatform && (
              <Controller
                name="calVideoSettings.disableTranscriptionForOrganizer"
                defaultValue={!!calVideoSettings?.disableTranscriptionForOrganizer}
                render={({ field: { onChange, value } }) => {
                  return (
                    <SettingsToggle
                      title={t("disable_transcription_for_organizer")}
                      description={t("disable_transcription_for_organizer_description")}
                      labelClassName="text-sm leading-6 whitespace-normal wrap-break-word"
                      checked={value}
                      disabled={!hasTeamPlan}
                      onCheckedChange={onChange}
                      Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                    />
                  );
                }}
              />
            )}

            <Controller
              name="calVideoSettings.requireEmailForGuests"
              defaultValue={!!calVideoSettings?.requireEmailForGuests}
              render={({ field: { onChange, value } }) => {
                return (
                  <SettingsToggle
                    title={t("require_email_for_guests")}
                    description={t("require_email_for_guests_description")}
                    labelClassName="text-sm leading-6 whitespace-normal break-words"
                    checked={value}
                    disabled={!hasTeamPlan}
                    onCheckedChange={onChange}
                    Badge={<UpgradeTeamsBadge checkForActiveStatus />}
                  />
                );
              }}
            />

            <TextField
              label={
                <div className="flex gap-1 items-center">
                  {t("redirect_url")}
                  <InfoBadge content={t("enter_redirect_url_on_exit_description")} />
                </div>
              }
              defaultValue={calVideoSettings?.redirectUrlOnExit || ""}
              data-testid="calVideoSettings.redirectUrlOnExit"
              containerClassName="mt-4"
              className="leading-6"
              {...formMethods.register("calVideoSettings.redirectUrlOnExit", {
                setValueAs: (v) => (!v || v.trim() === "" ? null : v),
              })}
            />
            <ErrorMessage
              errors={formMethods.formState.errors?.calVideoSettings}
              name="redirectUrlOnExit"
              className={classNames("text-error text-sm")}
              as="div"
              id="calVideoSettings.redirectUrlOnExit-error"
            />
          </LocationSettingsContainer>
        )}
      </div>
    </>
  );
};

export default CalVideoSettings;
