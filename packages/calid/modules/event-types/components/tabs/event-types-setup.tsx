import { Button } from "@calid/features/ui/components/button";
import { InputField, TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { TFunction } from "i18next";
import type { Dispatch, SetStateAction } from "react";
import { useState, useCallback, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";
import type { MultiValue } from "react-select";

import type { LocationCustomClassNames } from "@calcom/features/eventtypes/components/Locations";
import Locations from "@calcom/features/eventtypes/components/Locations";
import type {
  EventTypeSetupProps,
  InputClassNames,
  SelectClassNames,
  SettingsToggleClassNames,
  FormValues,
  LocationFormValues,
} from "@calcom/features/eventtypes/lib/types";
import { MAX_EVENT_DURATION_MINUTES, MIN_EVENT_DURATION_MINUTES, WEBSITE_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { localeOptions } from "@calcom/lib/i18n";
import { md } from "@calcom/lib/markdownIt";
import { slugify } from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import classNames from "@calcom/ui/classNames";
import { Editor } from "@calcom/ui/components/editor";
import { Select, Label, SettingsToggle } from "@calcom/ui/components/form";
import { Skeleton } from "@calcom/ui/components/skeleton";

export type EventSetupTabCustomClassNames = {
  wrapper?: string;
  titleSection?: {
    container?: string;
    titleInput?: InputClassNames;
    urlInput?: InputClassNames;
    descriptionInput?: Pick<InputClassNames, "input" | "label">;
  };
  durationSection?: {
    container?: string;
    singleDurationInput?: InputClassNames;
    multipleDuration?: {
      container?: string;
      availableDurationsSelect?: SelectClassNames;
      defaultDurationSelect?: SelectClassNames;
    };
    selectDurationToggle?: SettingsToggleClassNames;
  };
  locationSection?: LocationCustomClassNames & {
    container?: string;
    label?: string;
  };
};

export type EventSetupTabProps = Pick<
  EventTypeSetupProps,
  "eventType" | "locationOptions" | "team" | "teamMembers" | "destinationCalendar"
> & {
  customClassNames?: EventSetupTabCustomClassNames;
  onChange?: () => void;
  urlPrefix?: string;
  hasOrgBranding?: boolean;
  orgId?: number;
  localeOptions?: { value: string; label: string }[];
};

type DurationOption = {
  value: number;
  label: string;
};

const DURATION_OPTIONS = [
  5, 10, 15, 20, 25, 30, 45, 50, 60, 75, 80, 90, 120, 150, 180, 240, 300, 360, 420, 480,
] as const;

const useUrlManagement = (
  team: EventSetupTabProps["team"],
  formMethods: ReturnType<typeof useFormContext<FormValues>>,
  urlPrefix: string,
  slugValue: string
) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const generatePermalink = useCallback(() => {
    const userPath = team ? `team/${team.slug}` : formMethods.getValues("users")[0]?.username;
    return `${urlPrefix}/${userPath}/${slugValue}`;
  }, [team, formMethods, urlPrefix, slugValue]);

  const handleCopyUrl = useCallback(() => {
    const permalink = generatePermalink();
    navigator.clipboard.writeText(permalink);
    setCopiedUrl(true);
    triggerToast("Link copied!", "success");
    setTimeout(() => setCopiedUrl(false), 1500);
  }, [generatePermalink]);

  const handlePreviewUrl = useCallback(() => {
    const permalink = generatePermalink();
    window.open(permalink, "_blank");
  }, [generatePermalink]);

  return {
    copiedUrl,
    handleCopyUrl,
    handlePreviewUrl,
  };
};

const useDurationManagement = (
  formMethods: ReturnType<typeof useFormContext<FormValues>>,
  eventType: EventSetupTabProps["eventType"],
  t: TFunction
) => {
  const [multipleDuration, setMultipleDuration] = useState(
    formMethods.getValues("metadata")?.multipleDuration
  );

  const multipleDurationOptions = useMemo(
    (): DurationOption[] =>
      DURATION_OPTIONS.map((mins) => ({
        value: mins,
        label: t("multiple_duration_mins", { count: mins }),
      })),
    [t]
  );

  const [selectedMultipleDuration, setSelectedMultipleDuration] = useState<MultiValue<DurationOption>>(
    multipleDurationOptions.filter((mdOpt) => multipleDuration?.includes(mdOpt.value))
  );

  const [defaultDuration, setDefaultDuration] = useState<DurationOption | null>(
    selectedMultipleDuration.find((opt) => opt.value === formMethods.getValues("length")) ?? null
  );

  const handleDurationSelectionChange = useCallback(
    (options: MultiValue<DurationOption>) => {
      const sortedOptions = [...options].sort((a, b) => a.value - b.value);
      const values = sortedOptions.map((opt) => opt.value);

      setMultipleDuration(values);
      setSelectedMultipleDuration(sortedOptions);

      if (!sortedOptions.find((opt) => opt.value === defaultDuration?.value)) {
        const newDefault = sortedOptions.length > 0 ? sortedOptions[0] : null;
        setDefaultDuration(newDefault);

        if (newDefault) {
          formMethods.setValue("length", newDefault.value, { shouldDirty: true });
        }
      }

      if (sortedOptions.length === 1 && defaultDuration === null) {
        setDefaultDuration(sortedOptions[0]);
        formMethods.setValue("length", sortedOptions[0].value, { shouldDirty: true });
      }

      formMethods.setValue("metadata.multipleDuration", values, { shouldDirty: true });
    },
    [defaultDuration, formMethods]
  );

  const handleDefaultDurationChange = useCallback(
    (option: DurationOption | null) => {
      setDefaultDuration(option);
      if (option) {
        formMethods.setValue("length", option.value, { shouldDirty: true });
      }
    },
    [formMethods]
  );

  const toggleMultipleDuration = useCallback(() => {
    if (multipleDuration !== undefined) {
      setMultipleDuration(undefined);
      setSelectedMultipleDuration([]);
      setDefaultDuration(null);
      formMethods.setValue("metadata.multipleDuration", undefined, { shouldDirty: true });
      formMethods.setValue("length", eventType.length, { shouldDirty: true });
    } else {
      setMultipleDuration([]);
      formMethods.setValue("metadata.multipleDuration", [], { shouldDirty: true });
      formMethods.setValue("length", 0, { shouldDirty: true });
    }
  }, [multipleDuration, formMethods, eventType.length]);

  return {
    multipleDuration,
    multipleDurationOptions,
    selectedMultipleDuration,
    defaultDuration,
    handleDurationSelectionChange,
    handleDefaultDurationChange,
    toggleMultipleDuration,
  };
};

const TitleDescriptionSection = ({
  customClassNames,
  formMethods,
  eventType,
  t,
  firstRender,
  setFirstRender,
}: {
  customClassNames?: EventSetupTabCustomClassNames["titleSection"];
  formMethods: ReturnType<typeof useFormContext<FormValues>>;
  eventType: EventSetupTabProps["eventType"];
  t: TFunction;
  firstRender: boolean;
  setFirstRender: Dispatch<SetStateAction<boolean>>;
}) => (
  <>
    <TextField
      required
      containerClassName={classNames(customClassNames?.titleInput?.container)}
      labelClassName={classNames(customClassNames?.titleInput?.label)}
      className={classNames(customClassNames?.titleInput?.input)}
      label={t("title")}
      defaultValue={eventType.title}
      data-testid="event-title"
      {...formMethods.register("title")}
    />

    <div>
      <>
        <Label htmlFor="editor">{t("description")}</Label>
        <Editor
          getText={() => md.render(formMethods.getValues("description") || "")}
          setText={(value: string) =>
            formMethods.setValue("description", turndown(value), { shouldDirty: true })
          }
          excludedToolbarItems={["blockType"]}
          placeholder={t("quick_video_meeting")}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </>
    </div>
  </>
);

/**
 * URL Input Section Component
 */
const UrlSection = ({
  urlPrefix,
  team,
  hasOrgBranding,
  formMethods,
  t,
  handleCopyUrl,
  handlePreviewUrl,
}: {
  urlPrefix: string;
  team: EventSetupTabProps["team"];
  hasOrgBranding: boolean;
  formMethods: ReturnType<typeof useFormContext<FormValues>>;
  t: TFunction;
  handleCopyUrl: () => void;
  handlePreviewUrl: () => void;
}) => (
  <div className="relative w-full">
    <InputField
      type="text"
      addOnLeading={
        <>
          {urlPrefix}/
          {team ? (hasOrgBranding ? "" : "team/") + team.slug : formMethods.getValues("users")[0]?.username}/
        </>
      }
      addOnSuffix={
        <>
          <Button
            color="minimal"
            className="border-none"
            StartIcon="copy"
            onClick={handleCopyUrl}
            tooltip={t("copy_url")}
          />
          <Button
            color="minimal"
            className="border-none"
            StartIcon="external-link"
            onClick={handlePreviewUrl}
            tooltip={t("preview_url")}
          />
        </>
      }
      id="event-slug"
      inputIsFullWidth={true}
      containerClassName="w-full"
      {...formMethods.register("slug", { setValueAs: (v) => slugify(v) })}
    />
  </div>
);

/**
 * Duration Section Component
 */
const DurationSection = ({
  multipleDuration,
  multipleDurationOptions,
  selectedMultipleDuration,
  defaultDuration,
  customClassNames,
  formMethods,
  seatsEnabled,
  t,
  handleDurationSelectionChange,
  handleDefaultDurationChange,
  toggleMultipleDuration,
}: {
  multipleDuration: number[] | undefined;
  multipleDurationOptions: DurationOption[];
  selectedMultipleDuration: MultiValue<DurationOption>;
  defaultDuration: DurationOption | null;
  customClassNames?: EventSetupTabCustomClassNames["durationSection"];
  formMethods: ReturnType<typeof useFormContext<FormValues>>;
  seatsEnabled: boolean;
  t: TFunction;
  handleDurationSelectionChange: (options: MultiValue<DurationOption>) => void;
  handleDefaultDurationChange: (option: DurationOption | null) => void;
  toggleMultipleDuration: () => void;
}) => (
  <>
    {/* Duration Inputs */}
    {multipleDuration ? (
      <div className={classNames("space-y-6", customClassNames?.multipleDuration?.container)}>
        {/* Available Durations */}
        <div>
          <Skeleton
            as={Label}
            loadingClassName="w-16"
            className={customClassNames?.multipleDuration?.availableDurationsSelect?.label}>
            {t("available_durations")}
          </Skeleton>
          <Select
            isMulti
            defaultValue={selectedMultipleDuration}
            name="metadata.multipleDuration"
            isSearchable={false}
            className={classNames(
              " text-sm",
              customClassNames?.multipleDuration?.availableDurationsSelect?.select
            )}
            innerClassNames={customClassNames?.multipleDuration?.availableDurationsSelect?.innerClassNames}
            options={multipleDurationOptions}
            value={selectedMultipleDuration}
            onChange={handleDurationSelectionChange}
          />
        </div>

        {/* Default Duration */}
        <div className={customClassNames?.multipleDuration?.defaultDurationSelect?.container}>
          <Skeleton
            as={Label}
            loadingClassName="w-16"
            className={customClassNames?.multipleDuration?.defaultDurationSelect?.label}>
            {t("default_duration")}
          </Skeleton>
          <Select
            value={defaultDuration}
            isSearchable={false}
            name="length"
            className={classNames(
              "text-sm",
              customClassNames?.multipleDuration?.defaultDurationSelect?.select
            )}
            innerClassNames={customClassNames?.multipleDuration?.defaultDurationSelect?.innerClassNames}
            noOptionsMessage={() => t("default_duration_no_options")}
            options={selectedMultipleDuration}
            onChange={handleDefaultDurationChange}
          />
        </div>
      </div>
    ) : (
      /* Single Duration Input */
      <TextField
        required
        type="number"
        containerClassName={classNames(customClassNames?.singleDurationInput?.container)}
        labelClassName={classNames(customClassNames?.singleDurationInput?.label)}
        className={classNames(customClassNames?.singleDurationInput?.input)}
        data-testid="duration"
        label={t("duration")}
        defaultValue={formMethods.getValues("length") ?? 15}
        {...formMethods.register("length", {
          valueAsNumber: true,
          min: {
            value: MIN_EVENT_DURATION_MINUTES,
            message: t("duration_min_error", { min: MIN_EVENT_DURATION_MINUTES }),
          },
          max: {
            value: MAX_EVENT_DURATION_MINUTES,
            message: t("duration_max_error", { max: MAX_EVENT_DURATION_MINUTES }),
          },
        })}
        addOnSuffix={<>{t("minutes")}</>}
        min={MIN_EVENT_DURATION_MINUTES}
        max={MAX_EVENT_DURATION_MINUTES}
      />
    )}

    {/* Multiple Duration Toggle */}
    <div className="[&_label]:my-1 [&_label]:font-normal">
      <SettingsToggle
        title={t("allow_booker_to_select_duration")}
        checked={multipleDuration !== undefined}
        disabled={seatsEnabled}
        tooltip={seatsEnabled ? t("seat_options_doesnt_multiple_durations") : undefined}
        labelClassName={customClassNames?.selectDurationToggle?.label}
        descriptionClassName={customClassNames?.selectDurationToggle?.description}
        switchContainerClassName={customClassNames?.selectDurationToggle?.container}
        childrenClassName={customClassNames?.selectDurationToggle?.children}
        onCheckedChange={toggleMultipleDuration}
      />
    </div>
  </>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Event Setup Component - Handles the setup tab for event types
 *
 * Features:
 * - Event title and description editing
 * - URL slug management with copy/preview functionality
 * - Duration configuration (single or multiple options)
 * - Location settings
 * - Interface language selection
 * - Locked field management for managed event types
 */
export const EventSetup = (props: EventSetupTabProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const { eventType, team, customClassNames } = props;

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // URL and branding setup - use props first, fallback to calculated values
  const urlPrefix = useMemo(
    () => props.urlPrefix || `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`,
    [props.urlPrefix]
  );

  const hasOrgBranding = props.hasOrgBranding ?? false;
  // Interface language options - use props first, fallback to imported localeOptions
  const interfaceLanguageOptions = useMemo(() => {
    const options = (props.localeOptions ?? []) as { label: string; value: string }[];
    const finalOptions = options.length > 0 ? options : localeOptions;
    return finalOptions.length > 0
      ? [{ label: t("visitors_browser_language"), value: "" }, ...finalOptions]
      : [];
  }, [props.localeOptions, t]);

  const [firstRender, setFirstRender] = useState(true);

  // Form watches
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const slugValue = formMethods.watch("slug") ?? eventType.slug;

  // ============================================================================
  // CUSTOM HOOKS
  // ============================================================================

  const { handleCopyUrl, handlePreviewUrl } = useUrlManagement(team, formMethods, urlPrefix, slugValue);

  const {
    multipleDuration,
    multipleDurationOptions,
    selectedMultipleDuration,
    defaultDuration,
    handleDurationSelectionChange,
    handleDefaultDurationChange,
    toggleMultipleDuration,
  } = useDurationManagement(formMethods, eventType, t);

  return (
    <div className={classNames("space-y-6", customClassNames?.wrapper)}>
      {/* Title and Description Section */}
      <TitleDescriptionSection
        customClassNames={customClassNames?.titleSection}
        formMethods={formMethods}
        eventType={eventType}
        t={t}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
      />

      {/* Interface Language Selection */}
      {interfaceLanguageOptions.length > 0 && (
        <div>
          <Skeleton
            as={Label}
            loadingClassName="w-16"
            htmlFor="interfaceLanguage"
            className={customClassNames?.locationSection?.label}>
            {t("interface_language")}
          </Skeleton>
          <Controller
            name="interfaceLanguage"
            control={formMethods.control}
            defaultValue={eventType.interfaceLanguage ?? ""}
            render={({ field: { value, onChange } }) => (
              <Select<{ label: string; value: string }>
                data-testid="event-interface-language"
                className="capitalize"
                options={interfaceLanguageOptions}
                onChange={(option: { label: string; value: string } | null) => onChange(option?.value || "")}
                value={interfaceLanguageOptions.find((option) => option.value === value)}
              />
            )}
          />
        </div>
      )}

      {/* URL Section */}
      <UrlSection
        urlPrefix={urlPrefix}
        team={team}
        hasOrgBranding={hasOrgBranding}
        formMethods={formMethods}
        t={t}
        handleCopyUrl={handleCopyUrl}
        handlePreviewUrl={handlePreviewUrl}
      />

      {/* Duration Section */}
      <DurationSection
        multipleDuration={multipleDuration}
        multipleDurationOptions={multipleDurationOptions}
        selectedMultipleDuration={selectedMultipleDuration}
        defaultDuration={defaultDuration}
        customClassNames={customClassNames?.durationSection}
        formMethods={formMethods}
        seatsEnabled={seatsEnabled}
        t={t}
        handleDurationSelectionChange={handleDurationSelectionChange}
        handleDefaultDurationChange={handleDefaultDurationChange}
        toggleMultipleDuration={toggleMultipleDuration}
      />

      {/* Location Section */}
      <div>
        <Skeleton
          as={Label}
          loadingClassName="w-16"
          htmlFor="locations"
          className={customClassNames?.locationSection?.label}>
          {t("location")}
        </Skeleton>
        <Controller
          name="locations"
          control={formMethods.control}
          defaultValue={eventType.locations || []}
          render={() => (
            <Locations
              showAppStoreLink={true}
              getValues={formMethods.getValues as unknown as UseFormGetValues<LocationFormValues>}
              setValue={formMethods.setValue as unknown as UseFormSetValue<LocationFormValues>}
              control={formMethods.control as unknown as Control<LocationFormValues>}
              formState={formMethods.formState as unknown as FormState<LocationFormValues>}
              {...props}
              customClassNames={customClassNames?.locationSection}
            />
          )}
        />
      </div>
    </div>
  );
};
