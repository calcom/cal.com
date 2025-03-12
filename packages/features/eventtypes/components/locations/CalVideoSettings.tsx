import { ErrorMessage } from "@hookform/error-message";
import { useFormContext, Controller } from "react-hook-form";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { CalVideoSettings as CalVideoSettingsType } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { UpgradeTeamsBadge } from "@calcom/ui/components/badge";
import { TextField } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";

import LocationSettingsContainer from "./LocationSettingsContainer";

const CalVideoSettings = ({ calVideoSettings }: { calVideoSettings?: CalVideoSettingsType | null }) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();
  return (
    <LocationSettingsContainer>
      <Controller
        name="calVideoSettings.disableRecordingForGuests"
        defaultValue={!!calVideoSettings?.disableRecordingForGuests}
        render={({ field: { onChange, value } }) => {
          return (
            <SettingsToggle
              title={t("disable_recording_for_guests")}
              labelClassName="text-sm leading-6 whitespace-normal break-words"
              checked={value}
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
              labelClassName="text-sm leading-6 whitespace-normal break-words"
              checked={value}
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
                labelClassName="text-sm"
                checked={value}
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
              labelClassName="text-sm leading-6 whitespace-normal break-words"
              checked={value}
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
                labelClassName="text-sm leading-6 whitespace-normal break-words"
                checked={value}
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
                labelClassName="text-sm leading-6 whitespace-normal break-words"
                checked={value}
                onCheckedChange={onChange}
                Badge={<UpgradeTeamsBadge checkForActiveStatus />}
              />
            );
          }}
        />
      )}

      <Controller
        name="calVideoSettings.enableFlappyBirdGame"
        defaultValue={!!calVideoSettings?.enableFlappyBirdGame}
        render={({ field: { onChange, value } }) => {
          return (
            <SettingsToggle
              title={t("enable_flappy_bird_game")}
              description={t("enable_flappy_bird_game_description")}
              labelClassName="text-sm leading-6 whitespace-normal break-words"
              checked={value}
              onCheckedChange={onChange}
            />
          );
        }}
      />

      <TextField
        label={t("enter_redirect_url_on_exit_description")}
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
  );
};

export default CalVideoSettings;
