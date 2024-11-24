import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { UseFormGetValues, UseFormSetValue, Control, FormState } from "react-hook-form";
import type { MultiValue } from "react-select";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import Locations from "@calcom/features/eventtypes/components/Locations";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
import type { FormValues, LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { md } from "@calcom/lib/markdownIt";
import { slugify } from "@calcom/lib/slugify";
import turndown from "@calcom/lib/turndownService";
import { Label, Select, SettingsToggle, Skeleton, TextField, Editor, TextAreaField } from "@calcom/ui";

export type EventSetupTabProps = Pick<
  EventTypeSetupProps,
  "eventType" | "locationOptions" | "team" | "teamMembers" | "destinationCalendar"
>;
export const EventSetupTab = (
  props: EventSetupTabProps & { urlPrefix: string; hasOrgBranding: boolean; orgId?: number }
) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const formMethods = useFormContext<FormValues>();
  const { eventType, team, urlPrefix, hasOrgBranding, orgId } = props;
  const [multipleDuration, setMultipleDuration] = useState(
    formMethods.getValues("metadata")?.multipleDuration
  );
  const [firstRender, setFirstRender] = useState(true);

  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const autoTranslateDescriptionEnabled = formMethods.watch("autoTranslateDescriptionEnabled");

  const multipleDurationOptions = [
    5, 10, 15, 20, 25, 30, 45, 50, 60, 75, 80, 90, 120, 150, 180, 240, 300, 360, 420, 480,
  ].map((mins) => ({
    value: mins,
    label: t("multiple_duration_mins", { count: mins }),
  }));

  const [selectedMultipleDuration, setSelectedMultipleDuration] = useState<
    MultiValue<{
      value: number;
      label: string;
    }>
  >(multipleDurationOptions.filter((mdOpt) => multipleDuration?.includes(mdOpt.value)));
  const [defaultDuration, setDefaultDuration] = useState(
    selectedMultipleDuration.find((opt) => opt.value === formMethods.getValues("length")) ?? null
  );

  const { isChildrenManagedEventType, isManagedEventType, shouldLockIndicator, shouldLockDisableProps } =
    useLockedFieldsManager({ eventType, translate: t, formMethods });

  const lengthLockedProps = shouldLockDisableProps("length");
  const descriptionLockedProps = shouldLockDisableProps("description");
  const urlLockedProps = shouldLockDisableProps("slug");
  const titleLockedProps = shouldLockDisableProps("title");

  return (
    <div>
      <div className="space-y-4">
        <div className="border-subtle space-y-6 rounded-lg border p-6">
          <TextField
            required
            label={t("title")}
            {...(isManagedEventType || isChildrenManagedEventType ? titleLockedProps : {})}
            defaultValue={eventType.title}
            data-testid="event-title"
            {...formMethods.register("title")}
          />
          <div>
            {isPlatform ? (
              <TextAreaField
                {...formMethods.register("description", {
                  disabled: descriptionLockedProps.disabled,
                })}
                placeholder={t("quick_video_meeting")}
              />
            ) : (
              <>
                <Label htmlFor="editor">
                  {t("description")}
                  {(isManagedEventType || isChildrenManagedEventType) && shouldLockIndicator("description")}
                </Label>
                <Editor
                  getText={() => md.render(formMethods.getValues("description") || "")}
                  setText={(value: string) =>
                    formMethods.setValue("description", turndown(value), { shouldDirty: true })
                  }
                  excludedToolbarItems={["blockType"]}
                  placeholder={t("quick_video_meeting")}
                  editable={!descriptionLockedProps.disabled}
                  firstRender={firstRender}
                  setFirstRender={setFirstRender}
                />
              </>
            )}
          </div>
          <div className="[&_label]:my-1 [&_label]:font-normal">
            <SettingsToggle
              title={t("translate_description_button")}
              checked={!!autoTranslateDescriptionEnabled}
              onCheckedChange={(value) => {
                formMethods.setValue("autoTranslateDescriptionEnabled", value, { shouldDirty: true });
              }}
              disabled={!orgId}
              tooltip={!orgId ? t("orgs_upgrade_to_enable_feature") : undefined}
            />
          </div>
          <TextField
            required
            label={isPlatform ? "Slug" : t("URL")}
            {...(isManagedEventType || isChildrenManagedEventType ? urlLockedProps : {})}
            defaultValue={eventType.slug}
            data-testid="event-slug"
            addOnLeading={
              isPlatform ? undefined : (
                <>
                  {urlPrefix}/
                  {!isManagedEventType
                    ? team
                      ? (hasOrgBranding ? "" : "team/") + team.slug
                      : formMethods.getValues("users")[0].username
                    : t("username_placeholder")}
                  /
                </>
              )
            }
            {...formMethods.register("slug", {
              setValueAs: (v) => slugify(v),
            })}
          />
        </div>
        <div className="border-subtle rounded-lg border p-6">
          {multipleDuration ? (
            <div className="space-y-6">
              <div>
                <Skeleton as={Label} loadingClassName="w-16">
                  {t("available_durations")}
                </Skeleton>
                <Select
                  isMulti
                  defaultValue={selectedMultipleDuration}
                  name="metadata.multipleDuration"
                  isSearchable={false}
                  isDisabled={lengthLockedProps.disabled}
                  className="h-auto !min-h-[36px] text-sm"
                  options={multipleDurationOptions}
                  value={selectedMultipleDuration}
                  onChange={(options) => {
                    let newOptions = [...options];
                    newOptions = newOptions.sort((a, b) => {
                      return a?.value - b?.value;
                    });
                    const values = newOptions.map((opt) => opt.value);
                    setMultipleDuration(values);
                    setSelectedMultipleDuration(newOptions);
                    if (!newOptions.find((opt) => opt.value === defaultDuration?.value)) {
                      if (newOptions.length > 0) {
                        setDefaultDuration(newOptions[0]);
                        formMethods.setValue("length", newOptions[0].value, { shouldDirty: true });
                      } else {
                        setDefaultDuration(null);
                      }
                    }
                    if (newOptions.length === 1 && defaultDuration === null) {
                      setDefaultDuration(newOptions[0]);
                      formMethods.setValue("length", newOptions[0].value, { shouldDirty: true });
                    }
                    formMethods.setValue("metadata.multipleDuration", values, { shouldDirty: true });
                  }}
                />
              </div>
              <div>
                <Skeleton as={Label} loadingClassName="w-16">
                  {t("default_duration")}
                  {shouldLockIndicator("length")}
                </Skeleton>
                <Select
                  value={defaultDuration}
                  isSearchable={false}
                  name="length"
                  className="text-sm"
                  isDisabled={lengthLockedProps.disabled}
                  noOptionsMessage={() => t("default_duration_no_options")}
                  options={selectedMultipleDuration}
                  onChange={(option) => {
                    setDefaultDuration(
                      selectedMultipleDuration.find((opt) => opt.value === option?.value) ?? null
                    );
                    if (option) formMethods.setValue("length", option.value, { shouldDirty: true });
                  }}
                />
              </div>
            </div>
          ) : (
            <TextField
              required
              type="number"
              data-testid="duration"
              {...(isManagedEventType || isChildrenManagedEventType ? lengthLockedProps : {})}
              label={t("duration")}
              defaultValue={formMethods.getValues("length") ?? 15}
              {...formMethods.register("length")}
              addOnSuffix={<>{t("minutes")}</>}
              min={1}
            />
          )}
          {!lengthLockedProps.disabled && (
            <div className="!mt-4 [&_label]:my-1 [&_label]:font-normal">
              <SettingsToggle
                title={t("allow_booker_to_select_duration")}
                checked={multipleDuration !== undefined}
                disabled={seatsEnabled}
                tooltip={seatsEnabled ? t("seat_options_doesnt_multiple_durations") : undefined}
                onCheckedChange={() => {
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
                }}
              />
            </div>
          )}
        </div>
        <div className="border-subtle rounded-lg border p-6">
          <div>
            <Skeleton as={Label} loadingClassName="w-16" htmlFor="locations">
              {t("location")}
              {/*improve shouldLockIndicator function to also accept eventType and then conditionally render
              based on Managed Event type or not.*/}
              {shouldLockIndicator("locations")}
            </Skeleton>
            <Controller
              name="locations"
              control={formMethods.control}
              defaultValue={eventType.locations || []}
              render={() => (
                <Locations
                  showAppStoreLink={true}
                  isChildrenManagedEventType={isChildrenManagedEventType}
                  isManagedEventType={isManagedEventType}
                  disableLocationProp={shouldLockDisableProps("locations").disabled}
                  getValues={formMethods.getValues as unknown as UseFormGetValues<LocationFormValues>}
                  setValue={formMethods.setValue as unknown as UseFormSetValue<LocationFormValues>}
                  control={formMethods.control as unknown as Control<LocationFormValues>}
                  formState={formMethods.formState as unknown as FormState<LocationFormValues>}
                  {...props}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
