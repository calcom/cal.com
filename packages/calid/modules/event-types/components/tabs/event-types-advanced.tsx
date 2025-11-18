import {
  canDisableParticipantNotifications,
  canDisableOrganizerNotifications,
} from "@calid/features/modules/workflows/utils/notificationDisableCheck";
import { Alert } from "@calid/features/ui/components/alert";
import { Button } from "@calid/features/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@calid/features/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { CheckboxField } from "@calid/features/ui/components/input/checkbox-field";
import { Input } from "@calid/features/ui/components/input/input";
import { TextField } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { RadioGroup } from "@calid/features/ui/components/radio-group";
import { RadioGroupItem } from "@calid/features/ui/components/radio-group";
import { Switch } from "@calid/features/ui/components/switch";
import type { UnitTypeLongPlural } from "dayjs";
import type { TFunction } from "i18next";
import React, { useState, useCallback, useMemo, Suspense } from "react";
import { useFormContext, Controller } from "react-hook-form";
import type { z } from "zod";

// Core hooks and utilities
import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
// Calendar and scheduling components
import {
  SelectedCalendarsSettingsWebWrapper,
  SelectedCalendarSettingsScope,
  SelectedCalendarsSettingsWebWrapperSkeleton,
} from "@calcom/atoms/selected-calendars/wrappers/SelectedCalendarsSettingsWebWrapper";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import { MultiplePrivateLinksController } from "@calcom/features/eventtypes/components";
// Types
import type { FormValues, EventTypeSetup, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
// Form and booking components
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import type { fieldSchema, EditableSchema } from "@calcom/features/form-builder/schema";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import ServerTrans from "@calcom/lib/components/ServerTrans";
// Constants and utilities
import { MAX_SEATS_PER_TIME_SLOT } from "@calcom/lib/constants";
import { getEventName, validateCustomEventName } from "@calcom/lib/event";
import type { EventNameObjectType } from "@calcom/lib/event";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Select } from "@calcom/ui/components/form";

import { FieldPermissionIndicator, useFieldPermissions } from "./hooks/useFieldPermissions";

type BookingField = z.infer<typeof fieldSchema>;
export interface EventAdvancedProps {
  eventType: EventTypeSetup;
  team?: EventTypeSetupProps["team"];
  user?: Partial<
    Pick<
      RouterOutputs["viewer"]["me"]["calid_get"],
      "email" | "secondaryEmails" | "theme" | "defaultBookerLayouts" | "timeZone"
    >
  >;
  isUserLoading?: boolean;
  showToast: (message: string, variant: "success" | "warning" | "error") => void;
  calendarsQuery: {
    data?: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
    isPending: boolean;
    error: unknown;
  };
  showBookerLayoutSelector: boolean;
}

const SettingsToggle = ({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  children,
  tooltip,
  lockedIcon,
  switchContainerClassName = "",
  childrenClassName = "",
  labelClassName = "",
  descriptionClassName = "",
  "data-testid": dataTestId,
  fieldPermissions,
  fieldName,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  tooltip?: string;
  lockedIcon?: React.ReactNode;
  switchContainerClassName?: string;
  childrenClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  toggleSwitchAtTheEnd?: boolean;
  "data-testid"?: string;
  fieldPermissions?: ReturnType<typeof useFieldPermissions>;
  fieldName?: string;
}) => {
  const effectiveDisabled =
    disabled ||
    (fieldPermissions && fieldName ? fieldPermissions.getFieldState(fieldName).isDisabled : false);
  return (
    <Card className={classNames(switchContainerClassName)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 pr-8">
          <CardTitle
            className={classNames("text-default flex items-center text-sm font-medium", labelClassName)}>
            {title}
            {lockedIcon}
            {tooltip && (
              <button className="group relative ml-2 rounded-full p-1 hover:bg-gray-100" title={tooltip}>
                <Icon name="info" className="h-4 w-4 text-gray-400" />
                <div className="text-default pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-3 py-2 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                  {tooltip}
                </div>
              </button>
            )}
          </CardTitle>
          {description && (
            <CardDescription className={classNames(descriptionClassName)}>{description}</CardDescription>
          )}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={effectiveDisabled}
          data-testid={dataTestId}
        />
      </CardHeader>
      {checked && children && (
        <CardContent className={classNames("border-muted border-t", childrenClassName)}>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

const CustomEventNameModal = ({
  close,
  setValue,
  defaultValue = "",
  placeHolder,
  isNameFieldSplit,
  event,
}: {
  close: () => void;
  setValue: (val: string) => void;
  defaultValue?: string;
  placeHolder: string;
  isNameFieldSplit: boolean;
  event: EventNameObjectType;
}) => {
  const { t } = useLocale();
  const [customEventName, setCustomEventName] = useState(defaultValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewText = getEventName({ ...event, eventName: customEventName });
  const displayPlaceholder = customEventName === "" ? previewText : placeHolder;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const validationResult = validateCustomEventName(customEventName, event.bookingFields);
      if (typeof validationResult === "string") {
        setValidationError(t("invalid_event_name_variables", { item: validationResult }));
        return;
      }

      setValue(customEventName);
      close();
    },
    [customEventName, event.bookingFields, setValue, close, t]
  );

  // Memoize variable definitions to prevent recalculation
  const variableDefinitions = useMemo(
    () => [
      { key: "{Event type title}", description: t("event_name_info") },
      { key: "{Event duration}", description: t("event_duration_info") },
      { key: "{Organiser}", description: t("your_full_name") },
      { key: "{Organiser first name}", description: t("organizer_first_name") },
      { key: "{Scheduler}", description: t("scheduler_full_name") },
      { key: "{Scheduler first name}", description: t("scheduler_first_name") },
      ...(isNameFieldSplit ? [{ key: "{Scheduler last name}", description: t("scheduler_last_name") }] : []),
      { key: "{Location}", description: t("location_info") },
    ],
    [t, isNameFieldSplit]
  );

  return (
    <Dialog open={true} onOpenChange={close}>
      <DialogContent size="default" enableOverflow>
        <DialogHeader>
          <DialogTitle>{t("custom_event_name")}</DialogTitle>
          <DialogDescription>{t("custom_event_name_description")}</DialogDescription>
        </DialogHeader>
        <form id="custom-event-name" onSubmit={handleSubmit}>
          <TextField
            label={t("event_name_in_calendar")}
            type="text"
            placeholder={displayPlaceholder}
            value={customEventName}
            onChange={(e) => {
              setCustomEventName(e.target.value);
              setValidationError(null);
            }}
            error={validationError ?? undefined}
          />

          <div className="pt-6 text-sm">
            <h1 className="text-emphasis mb-1 font-medium">{t("available_variables")}</h1>
            <div className="border-default mb-6 rounded-md border p-2">
              <div className="scroll-bar h-[216px] overflow-y-auto">
                {variableDefinitions.map((variable) => (
                  <div key={variable.key} className="mb-2.5 flex font-normal">
                    <p className="text-subtle ml-1 mr-5 w-32">{variable.key}</p>
                    <p className="text-emphasis">{variable.description}</p>
                  </div>
                ))}

                {event.bookingFields && (
                  <>
                    <p className="text-subtle mb-2 ml-1 font-medium">
                      {t("booking_question_response_variables")}
                    </p>
                    {Object.entries(event.bookingFields).map(([fieldName, fieldValue]) => (
                      <div key={fieldName} className="mb-2.5 flex font-normal">
                        <p className="text-subtle ml-1 mr-5 w-32">{`{${fieldName}}`}</p>
                        <p className="text-emphasis capitalize">{fieldValue?.toString()}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Calendar Preview */}
            <h1 className="mb-1 text-sm font-medium">{t("preview")}</h1>
            <div
              className="flex h-[212px] w-full rounded-md border-y bg-cover bg-center dark:invert"
              style={{ backgroundImage: "url(/calendar-preview.svg)" }}>
              <div className="m-auto flex items-center justify-center self-stretch">
                <div className="bg-subtle ml-11 mt-3 box-border h-[110px] w-[120px] flex-col items-start gap-1 rounded-md border border-solid border-black text-[12px] leading-3">
                  <p className="text-emphasis overflow-hidden text-ellipsis p-1.5 font-medium">
                    {previewText}
                  </p>
                  <p className="text-default ml-1.5 text-[10px] font-normal">8 - 10 AM</p>
                </div>
              </div>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="button" color="minimal" onClick={close}>
            {t("cancel")}
          </Button>
          <Button form="custom-event-name" type="submit" color="primary">
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Destination calendar settings with email configuration
 * Handles calendar selection and organizer email settings
 */
const DestinationCalendarSettings = ({
  showConnectedCalendarSettings,
  calendarsQuery,
  eventNamePlaceholder,
  setShowEventNameTip,
  verifiedSecondaryEmails,
  userEmail,
  isTeamEventType,
  showToast,
}: {
  showConnectedCalendarSettings: boolean;
  calendarsQuery: any;
  eventNamePlaceholder: string;
  setShowEventNameTip: React.Dispatch<React.SetStateAction<boolean>>;
  verifiedSecondaryEmails: { label: string; value: number }[];
  userEmail: string;
  isTeamEventType: boolean;
  showToast: (message: string, variant: string) => void;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const useEventTypeDestinationCalendarEmail = formMethods.watch("useEventTypeDestinationCalendarEmail");
  const selectedSecondaryEmailId = formMethods.watch("secondaryEmailId") || -1;

  const handleEmailToggle = useCallback(
    (val: boolean) => {
      formMethods.setValue("useEventTypeDestinationCalendarEmail", val, { shouldDirty: true });
      if (val) {
        showToast(t("reconnect_calendar_to_use"), "warning");
      }
    },
    [formMethods, showToast, t]
  );

  return (
    <Card className="space-y-6">
      <CardContent className="space-y-2">
        {showConnectedCalendarSettings && (
          <div className="w-full">
            <Switch
              tooltip={t("if_enabled_email_address_as_organizer")}
              label={
                <>
                  {t("display_add_to_calendar_organizer")}
                  <Icon
                    name="info"
                    className="text-default hover:text-attention hover:bg-attention ms-1 inline h-4 w-4 rounded-md"
                  />
                </>
              }
              checked={useEventTypeDestinationCalendarEmail}
              onCheckedChange={handleEmailToggle}
            />
          </div>
        )}

        {!useEventTypeDestinationCalendarEmail && verifiedSecondaryEmails.length > 0 && !isTeamEventType && (
          <div className="flex flex-row gap-2">
            <div className="w-full">
              <Label className="text-foreground mb-1 text-sm">{t("add_to_calendar")}</Label>
              <Select
                value={verifiedSecondaryEmails.find(
                  (email) => String(email.value) === String(selectedSecondaryEmailId)
                )}
                onChange={(option) =>
                  formMethods.setValue("secondaryEmailId", option ? Number(option.value) : -1, {
                    shouldDirty: true,
                  })
                }
                options={verifiedSecondaryEmails.map((secondaryEmail) => ({
                  value: String(secondaryEmail.value),
                  label: secondaryEmail.label,
                }))}
                placeholder={selectedSecondaryEmailId === -1 ? `${t("default")} ${userEmail}` : undefined}
                className="w-full"
              />
              <p className="text-subtle mt-1 text-sm">{t("select_which_cal")}</p>
            </div>
            <div className="w-full">
              <TextField
                label={t("event_name_in_calendar")}
                type="text"
                placeholder={eventNamePlaceholder}
                {...formMethods.register("eventName")}
                addOnSuffix={
                  <Button
                    EndIcon="pencil-line"
                    size="sm"
                    color="minimal"
                    aria-label="edit custom name"
                    onClick={() => setShowEventNameTip((old) => !old)}
                  />
                }
              />
            </div>
          </div>
        )}

        {showConnectedCalendarSettings && (
          <div className="flex w-full flex-col">
            <label className="text-emphasis mb-0 font-medium">{t("add_to_calendar")}</label>
            <Controller
              name="destinationCalendar"
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  value={value ? value.externalId : undefined}
                  onChange={onChange}
                  hidePlaceholder
                  hideAdvancedText
                  calendarsQueryData={calendarsQuery.data}
                />
              )}
            />
            <p className="text-subtle text-sm">{t("select_which_cal")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CalendarSettings = ({
  eventType,
  calendarsQuery,
  verifiedSecondaryEmails,
  userEmail,
  isTeamEventType,
  eventNamePlaceholder,
  setShowEventNameTip,
  showToast,
}: any) => {
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();

  const isConnectedCalendarSettingsApplicable = !isTeamEventType;
  const isConnectedCalendarSettingsLoading = calendarsQuery.isPending;
  const showConnectedCalendarSettings =
    !!calendarsQuery.data?.connectedCalendars.length && isConnectedCalendarSettingsApplicable;

  const selectedCalendarSettingsScope = formMethods.getValues("useEventLevelSelectedCalendars")
    ? SelectedCalendarSettingsScope.EventType
    : SelectedCalendarSettingsScope.User;

  const destinationCalendar = calendarsQuery.data?.destinationCalendar;

  // Show loading skeleton while calendar data is being fetched
  if (isConnectedCalendarSettingsLoading && isConnectedCalendarSettingsApplicable) {
    return (
      <Card className="space-y-6">
        <CardContent className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          <div className="flex w-full flex-col">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-4 w-48 animate-pulse rounded-md" />
          </div>
          <div className="w-full">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
          </div>
        </CardContent>
        <CardContent className="space-y-2">
          <div className="bg-emphasis h-6 w-64 animate-pulse rounded-md" />
          <div className="bg-emphasis h-10 w-full animate-pulse rounded-md" />
          <div className="bg-emphasis h-4 w-48 animate-pulse rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <DestinationCalendarSettings
        verifiedSecondaryEmails={verifiedSecondaryEmails}
        userEmail={userEmail}
        isTeamEventType={isTeamEventType}
        calendarsQuery={calendarsQuery}
        eventNamePlaceholder={eventNamePlaceholder}
        setShowEventNameTip={setShowEventNameTip}
        showToast={showToast}
        showConnectedCalendarSettings={showConnectedCalendarSettings}
      />

      {/* Selected calendars configuration */}
      {isConnectedCalendarSettingsApplicable && showConnectedCalendarSettings && (
        <div className="mt-4">
          <Suspense fallback={<SelectedCalendarsSettingsWebWrapperSkeleton />}>
            {!isPlatform && (
              <SelectedCalendarsSettingsWebWrapper
                eventTypeId={eventType.id}
                disabledScope={SelectedCalendarSettingsScope.User}
                disableConnectionModification={true}
                scope={selectedCalendarSettingsScope}
                destinationCalendarId={destinationCalendar?.externalId}
                setScope={(scope) => {
                  const chosenScopeIsEventLevel = scope === SelectedCalendarSettingsScope.EventType;
                  formMethods.setValue("useEventLevelSelectedCalendars", chosenScopeIsEventLevel, {
                    shouldDirty: true,
                  });
                }}
              />
            )}
          </Suspense>
        </div>
      )}
    </div>
  );
};

/**
 * Booking confirmation settings with threshold configuration
 * Handles confirmation requirements and timing settings
 */
const RequiresConfirmationController = ({
  seatsEnabled,
  metadata,
  requiresConfirmation,
  requiresConfirmationWillBlockSlot,
  onRequiresConfirmation,
  fieldPermissions,
}: {
  seatsEnabled: boolean;
  metadata: any;
  requiresConfirmation: boolean;
  requiresConfirmationWillBlockSlot?: boolean;
  onRequiresConfirmation: (value: boolean) => void;
  fieldPermissions: ReturnType<typeof useFieldPermissions>;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [requiresConfirmationSetup, setRequiresConfirmationSetup] = useState(
    metadata?.requiresConfirmationThreshold
  );

  const defaultRequiresConfirmationSetup = { time: 30, unit: "minutes" as UnitTypeLongPlural };

  // Memoize time unit options
  const timeUnitOptions = useMemo(
    () => [
      { label: t("minute_timeUnit"), value: "minutes" },
      { label: t("hour_timeUnit"), value: "hours" },
    ],
    [t]
  );

  const defaultValue = useMemo(
    () =>
      timeUnitOptions.find(
        (opt) =>
          opt.value ===
          (metadata?.requiresConfirmationThreshold?.unit ?? defaultRequiresConfirmationSetup.unit)
      ),
    [timeUnitOptions, metadata?.requiresConfirmationThreshold?.unit, defaultRequiresConfirmationSetup.unit]
  );

  // Stable handlers to prevent infinite re-renders
  const handleConfirmationChange = useCallback(
    (val: boolean) => {
      formMethods.setValue("requiresConfirmation", val, { shouldDirty: true });
      if (!val) {
        formMethods.setValue("requiresConfirmationWillBlockSlot", false, { shouldDirty: true });
        formMethods.setValue("requiresConfirmationForFreeEmail", false, { shouldDirty: true });
      }
      onRequiresConfirmation(val);
    },
    [formMethods, onRequiresConfirmation]
  );

  const handleTimeChange = useCallback(
    (val: number) => {
      setRequiresConfirmationSetup((prev) => ({
        unit: prev?.unit ?? defaultRequiresConfirmationSetup.unit,
        time: val,
      }));
      formMethods.setValue("metadata.requiresConfirmationThreshold.time", val, { shouldDirty: true });
    },
    [formMethods, defaultRequiresConfirmationSetup.unit]
  );

  const handleUnitChange = useCallback(
    (unit: UnitTypeLongPlural) => {
      setRequiresConfirmationSetup((prev) => ({
        time: prev?.time ?? defaultRequiresConfirmationSetup.time,
        unit,
      }));
      formMethods.setValue("metadata.requiresConfirmationThreshold.unit", unit, { shouldDirty: true });
    },
    [formMethods, defaultRequiresConfirmationSetup.time]
  );

  return (
    <div className="block items-start sm:flex">
      <div className="w-full">
        <Controller
          name="requiresConfirmation"
          control={formMethods.control}
          render={() => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(requiresConfirmation && "rounded-b-none")}
              childrenClassName="lg:ml-0"
              title={t("requires_confirmation")}
              data-testid="requires-confirmation"
              disabled={seatsEnabled}
              tooltip={seatsEnabled ? t("seat_options_doesnt_support_confirmation") : undefined}
              description={t("requires_confirmation_description")}
              checked={requiresConfirmation}
              onCheckedChange={handleConfirmationChange}
              fieldPermissions={fieldPermissions}
              fieldName="requiresConfirmation"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="requiresConfirmation"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }>
              <div className="border-subtle">
                <RadioGroup
                  defaultValue={
                    requiresConfirmation
                      ? requiresConfirmationSetup === undefined
                        ? "always"
                        : "notice"
                      : undefined
                  }
                  onValueChange={(val) => {
                    if (val === "always") {
                      formMethods.setValue("requiresConfirmation", true, { shouldDirty: true });
                      onRequiresConfirmation(true);
                      formMethods.setValue("metadata.requiresConfirmationThreshold", undefined, {
                        shouldDirty: true,
                      });
                      setRequiresConfirmationSetup(undefined);
                    } else if (val === "notice") {
                      formMethods.setValue("requiresConfirmation", true, { shouldDirty: true });
                      onRequiresConfirmation(true);
                      formMethods.setValue(
                        "metadata.requiresConfirmationThreshold",
                        requiresConfirmationSetup || defaultRequiresConfirmationSetup,
                        { shouldDirty: true }
                      );
                    }
                  }}>
                  <div className="flex flex-col flex-wrap justify-start gap-y-2">
                    {/* Always require confirmation option */}
                    <div className="flex items-center">
                      <RadioGroupItem value="always" id="always" className="mr-2" />
                      <Label>{t("always")}</Label>
                    </div>

                    {/* Conditional confirmation with time threshold */}
                    <>
                      <div className="flex items-center">
                        <RadioGroupItem value="notice" id="notice" className="mr-2" />
                        <Label>
                          <ServerTrans
                            t={t}
                            i18nKey="when_booked_with_less_than_notice"
                            components={[
                              <div
                                key="when_booked_with_less_than_notice"
                                className="inline-flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  onChange={(evt) => {
                                    const val = Number(evt.target?.value);
                                    handleTimeChange(val);
                                  }}
                                  className="!m-0 block"
                                  defaultValue={metadata?.requiresConfirmationThreshold?.time || 30}
                                />

                                <Label>
                                  <Select
                                    value={timeUnitOptions.find((opt) => opt.value === defaultValue?.value)}
                                    onChange={(option) => {
                                      if (option) {
                                        handleUnitChange(option.value as UnitTypeLongPlural);
                                      }
                                    }}
                                    options={timeUnitOptions.map((opt) => ({
                                      value: opt.value,
                                      label: opt.label,
                                    }))}
                                    className="w-24"
                                  />
                                </Label>
                              </div>,
                            ]}
                          />
                        </Label>
                      </div>

                      <Controller
                        name="requiresConfirmationWillBlockSlot"
                        render={({ field: { value, onChange } }) => (
                          <CheckboxField
                            checked={value}
                            onCheckedChange={(checked) => {
                              onChange(!!checked, {
                                shouldDirty: true,
                              });
                            }}
                            descriptionAsLabel
                            description={t("requires_confirmation_will_block_slot_description")}
                          />
                        )}
                      />

                      <Controller
                        name="requiresConfirmationForFreeEmail"
                        render={({ field: { value, onChange } }) => (
                          <CheckboxField
                            checked={value}
                            onCheckedChange={(checked) => {
                              onChange(!!checked, {
                                shouldDirty: true,
                              });
                            }}
                            descriptionAsLabel
                            description={t("require_confirmation_for_free_email")}
                          />
                        )}
                      />
                    </>
                  </div>
                </RadioGroup>
              </div>
            </SettingsToggle>
          )}
        />
      </div>
    </div>
  );
};

/**
 * Confirmation dialog for disabling all email notifications
 * Requires user to type "confirm" to prevent accidental changes
 */
const DisableAllEmailsSetting = ({
  checked,
  onCheckedChange,
  recipient,
  t,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  recipient: "attendees" | "hosts";
  t: TFunction;
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const confirmationString = t("confirm");

  const title =
    recipient === "attendees" ? t("disable_all_emails_to_attendees") : t("disable_all_emails_to_hosts");

  return (
    <div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={title} Icon="circle-alert">
          <p className="text-default text-sm">
            <ServerTrans t={t} i18nKey="disable_attendees_emails_description" values={{ recipient }} />
          </p>
          <p className="text-default mb-1 mt-2 text-sm">{t("type_confirm_to_continue")}</p>
          <TextField value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <DialogFooter>
            <DialogClose />
            <Button
              disabled={confirmText.toLowerCase() !== confirmationString.toLowerCase()}
              onClick={() => {
                onCheckedChange(true);
                setDialogOpen(false);
                setConfirmText(""); // Reset confirmation text
              }}>
              {t("disable_email")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={title}
        description={t("disable_all_emails_description")}
        checked={checked}
        onCheckedChange={() => (checked ? onCheckedChange(false) : setDialogOpen(true))}
      />
    </div>
  );
};

/**
 * Main EventAdvanced component
 * Handles all advanced event type configuration settings including calendar integration,
 * booking requirements, notifications, and customization options
 */
export const EventAdvanced = ({
  eventType,
  team,
  user,
  isUserLoading = false,
  showToast,
  calendarsQuery,
  showBookerLayoutSelector,
}: EventAdvancedProps) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const platformContext = useAtomsContext();
  const formMethods = useFormContext<FormValues>();

  // Field permissions management
  const fieldPermissions = useFieldPermissions({ eventType, translate: t, formMethods });

  // Fetch verified emails for the team or user
  const { data: verifiedEmails } = trpc.viewer.workflows.calid_getVerifiedEmails.useQuery({
    calIdTeamId: (eventType as any).calIdTeamId || undefined,
  });

  // UI state management
  const [showEventNameTip, setShowEventNameTip] = useState(false);

  // Toggle visibility states for conditional sections
  const [multiplePrivateLinksVisible, setMultiplePrivateLinksVisible] = useState(
    !!formMethods.getValues("multiplePrivateLinks")?.length
  );
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));
  const [customReplyToEmailVisible, setCustomReplyToEmailVisible] = useState(
    !!formMethods.getValues("customReplyToEmail")
  );

  const customReplyToEmailValue = formMethods.watch("customReplyToEmail");

  // Watch form values for reactive UI updates
  const requiresConfirmation = formMethods.watch("requiresConfirmation") || false;
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  // Derived state from form values
  const workflows =
    (eventType as any).calIdWorkflows?.map((workflowOnEventType: any) => workflowOnEventType.workflow) ?? [];
  const multiLocation = (formMethods.getValues("locations") || []).length > 1;
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";
  const isRecurringEvent = !!formMethods.getValues("recurringEvent");
  const isRoundRobinEventType = eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  // Process booking fields for event name object
  const bookingFields: any = {};
  (formMethods.getValues().bookingFields || []).forEach(({ name }: any) => {
    bookingFields[name] = `${name} input`;
  });

  const nameBookingField = (formMethods.getValues().bookingFields || []).find(
    (field) => field.name === "name"
  );
  const isSplit = nameBookingField?.variant === "firstAndLastName";

  // Create event name object for preview and validation
  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: formMethods.getValues("title"),
    eventName: formMethods.getValues("eventName"),
    host: formMethods.getValues("users")?.[0]?.name || "Nameless",
    bookingFields,
    eventDuration: formMethods.getValues("length"),
    t,
  };

  const eventNamePlaceholder = getEventName({
    ...eventNameObject,
    eventName: formMethods.watch("eventName"),
  });

  // Extract user timezone from event type configuration
  const userTimeZone = extractHostTimezone({
    userId: eventType.userId,
    teamId: (eventType as any).calIdTeamId,
    hosts: eventType.hosts,
    owner: eventType.owner,
    team: (eventType as any).calIdTeam,
  });

  // Platform-specific email processing
  const removePlatformClientIdFromEmail = useCallback(
    (email: string, clientId: string) => email.replace(`+${clientId}`, ""),
    []
  );

  // Process verified secondary emails
  const verifiedSecondaryEmails = useMemo(() => {
    let emails = [
      { label: user?.email || "", value: -1 },
      ...((user?.secondaryEmails || [])
        .filter((secondaryEmail) => secondaryEmail.emailVerified)
        .map((secondaryEmail) => ({ label: secondaryEmail.email, value: secondaryEmail.id })) ?? []),
    ];

    // Apply platform-specific email processing if needed
    if (isPlatform && platformContext.clientId) {
      emails = emails.map((email) => ({
        ...email,
        label: removePlatformClientIdFromEmail(email.label, platformContext.clientId),
      }));
    }

    return emails;
  }, [
    user?.email,
    user?.secondaryEmails,
    isPlatform,
    platformContext.clientId,
    removePlatformClientIdFromEmail,
  ]);

  let userEmail = user?.email || "";
  if (isPlatform && platformContext.clientId) {
    userEmail = removePlatformClientIdFromEmail(userEmail, platformContext.clientId);
  }

  // Detect user's theme preference
  const selectedThemeIsDark = useMemo(() => {
    return (
      user?.theme === "dark" ||
      (!user?.theme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
    );
  }, [user?.theme]);

  // Stable callback for toggling guest field visibility
  const toggleGuests = useCallback(
    (enabled: boolean) => {
      const bookingFields = formMethods.getValues("bookingFields");
      formMethods.setValue(
        "bookingFields",
        (bookingFields || []).map((field: any) => {
          if (field.name === "guests") {
            return {
              ...field,
              hidden: !enabled,
              editable: (!enabled ? "system-but-hidden" : "system-but-optional") as z.infer<
                typeof EditableSchema
              >,
            };
          }
          return field;
        }),
        { shouldDirty: true }
      );
    },
    [formMethods]
  );

  return (
    <div className="flex flex-col space-y-4">
      {/* Calendar Integration Settings */}
      <CalendarSettings
        verifiedSecondaryEmails={verifiedSecondaryEmails}
        userEmail={userEmail}
        calendarsQuery={calendarsQuery}
        isTeamEventType={!!team}
        eventNamePlaceholder={eventNamePlaceholder}
        setShowEventNameTip={setShowEventNameTip}
        showToast={showToast}
        eventType={eventType}
      />

      {/* Booker Layout Configuration */}
      {showBookerLayoutSelector && (
        <BookerLayoutSelector
          fallbackToUserSettings
          isDark={selectedThemeIsDark}
          isOuterBorder={true}
          user={user}
          isUserLoading={isUserLoading}
        />
      )}

      {/* Booking Questions Form Builder */}
      <Card>
        <CardContent className="px-3 pb-3">
          <div className="mb-5 px-3">
            <h1 className="text-default text-sm font-medium">{t("booking_questions_title")}</h1>
            <p className="text-subtle text-sm">{t("booking_questions_description")}</p>
          </div>
          <Card className="p-5">
            <FormBuilder
              showPhoneAndEmailToggle
              title={t("confirmation")}
              description={t("what_booker_should_provide")}
              addFieldLabel={t("add_a_booking_question")}
              formProp="bookingFields"
              disabled={false}
              LockedIcon={false as any}
              dataStore={{
                options: {
                  locations: {
                    source: { label: "Location" },
                    value: getLocationsOptionsForSelect(formMethods.getValues("locations") ?? [], t),
                  },
                },
              }}
              shouldConsiderRequired={(field: BookingField) => {
                return field.name === "location" ? true : field.required;
              }}
            />
          </Card>
        </CardContent>
      </Card>

      {/* Confirmation Requirements */}
      <RequiresConfirmationController
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        requiresConfirmationWillBlockSlot={formMethods.getValues("requiresConfirmationWillBlockSlot")}
        onRequiresConfirmation={(value) => {
          formMethods.setValue("requiresConfirmation", value, { shouldDirty: true });
        }}
        fieldPermissions={fieldPermissions}
      />

      {/* Cancellation and Rescheduling Controls */}
      {!isPlatform && (
        <>
          <Controller
            name="disableCancelling"
            render={({ field: { value, onChange } }) => (
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                title={t("disable_cancelling")}
                data-testid="disable-cancelling-toggle"
                description={t("description_disable_cancelling")}
                checked={value || false}
                onCheckedChange={onChange}
                fieldPermissions={fieldPermissions}
                fieldName="disableCancelling"
                lockedIcon={
                  <FieldPermissionIndicator
                    fieldName="disableCancelling"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                }
              />
            )}
          />

          <Controller
            name="disableRescheduling"
            render={({ field: { value, onChange } }) => (
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                title={t("disable_rescheduling")}
                data-testid="disable-rescheduling-toggle"
                description={t("description_disable_rescheduling")}
                checked={value || false}
                onCheckedChange={onChange}
                fieldPermissions={fieldPermissions}
                fieldName="disableRescheduling"
                lockedIcon={
                  <FieldPermissionIndicator
                    fieldName="disableRescheduling"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                }
              />
            )}
          />
        </>
      )}

      {/* Email Verification Requirement */}
      <Controller
        name="requiresBookerEmailVerification"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("requires_booker_email_verification")}
            data-testid="requires-booker-email-verification"
            description={t("description_requires_booker_email_verification")}
            checked={value}
            onCheckedChange={onChange}
            fieldPermissions={fieldPermissions}
            fieldName="requiresBookerEmailVerification"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="requiresBookerEmailVerification"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      {/* Calendar Privacy Settings */}
      <Controller
        name="hideCalendarNotes"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            data-testid="disable-notes"
            title={t("disable_notes")}
            description={t("disable_notes_description")}
            checked={value}
            onCheckedChange={onChange}
            fieldPermissions={fieldPermissions}
            fieldName="hideCalendarNotes"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="hideCalendarNotes"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      <Controller
        name="hideCalendarEventDetails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("hide_calendar_event_details")}
            description={t("description_hide_calendar_event_details")}
            checked={value}
            onCheckedChange={onChange}
            fieldPermissions={fieldPermissions}
            fieldName="hideCalendarEventDetails"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="hideCalendarEventDetails"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      {/* Success Redirect Configuration */}
      <Controller
        name="successRedirectUrl"
        rules={{
          required: redirectUrlVisible ? t("redirect_url_required") : false,
          pattern: {
            value: /^(https?:\/\/)([\w-]+(\.[\w-]+)+)([\/\w .-]*)*\/?$/,
            message: t("invalid_url_error_message", {
              label: t("redirect_success_booking"),
              sampleUrl: "https://example.com",
            }),
          },
        }}
        render={({ field, fieldState }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(redirectUrlVisible && "rounded-b-none")}
            childrenClassName="lg:ml-0"
            title={t("redirect_success_booking")}
            data-testid="redirect-success-booking"
            description={t("redirect_url_description")}
            checked={redirectUrlVisible}
            onCheckedChange={(e) => {
              field.onChange(e ? field.value || "" : "");
              setRedirectUrlVisible(e);
            }}
            fieldPermissions={fieldPermissions}
            fieldName="successRedirectUrl"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="successRedirectUrl"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }>
            <TextField
              className="w-full"
              label={t("redirect_success_booking")}
              labelSrOnly
              placeholder={t("external_redirect_url")}
              data-testid="external-redirect-url"
              required={redirectUrlVisible}
              type="text"
              value={field.value || ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={fieldPermissions.getFieldState("successRedirectUrl").isDisabled}
              LockedIcon={
                <FieldPermissionIndicator
                  fieldName="successRedirectUrl"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
            />

            {fieldState.error && <p className="mt-2 text-sm text-red-600">{fieldState.error.message}</p>}

            <div className="mt-4">
              <Controller
                name="forwardParamsSuccessRedirect"
                render={({ field: { value: forwardValue, onChange: forwardOnChange } }) => (
                  <div className="flex items-center gap-2">
                    <CheckboxField checked={forwardValue} onCheckedChange={forwardOnChange} />
                    <Label>{t("forward_params_redirect")}</Label>
                  </div>
                )}
              />
            </div>

            <div
              className={classNames(
                "p-1 text-sm text-orange-600",
                formMethods.getValues("successRedirectUrl") ? "block" : "hidden"
              )}
              data-testid="redirect-url-warning">
              {t("redirect_url_warning")}
            </div>
          </SettingsToggle>
        )}
      />

      {/* Private Links Management */}
      {!isPlatform && (
        <Controller
          name="multiplePrivateLinks"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(multiplePrivateLinksVisible && "rounded-b-none")}
              childrenClassName="lg:ml-0"
              data-testid="multiplePrivateLinksCheck"
              title={t("multiple_private_links_title")}
              description={t("multiple_private_links_description")}
              checked={multiplePrivateLinksVisible}
              onCheckedChange={(e) => {
                if (!e) {
                  onChange([]);
                } else {
                  const newLink = generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id);
                  onChange([newLink]);
                }
                setMultiplePrivateLinksVisible(e);
              }}
              fieldPermissions={fieldPermissions}
              fieldName="multiplePrivateLinks"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="multiplePrivateLinks"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }>
              <div>
                <MultiplePrivateLinksController
                  team={team ?? null}
                  bookerUrl={eventType.bookerUrl}
                  userTimeZone={userTimeZone}
                  setMultiplePrivateLinksVisible={setMultiplePrivateLinksVisible}
                />
              </div>
            </SettingsToggle>
          )}
        />
      )}

      {/* Seats Configuration */}
      <Controller
        name="seatsPerTimeSlotEnabled"
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(value && "rounded-b-none")}
              childrenClassName="lg:ml-0"
              data-testid="offer-seats-toggle"
              title={t("offer_seats")}
              disabled={noShowFeeEnabled || multiLocation || (!seatsEnabled && isRecurringEvent)}
              description={t("offer_seats_description")}
              checked={value}
              tooltip={
                multiLocation
                  ? t("multilocation_doesnt_support_seats")
                  : noShowFeeEnabled
                  ? t("no_show_fee_doesnt_support_seats")
                  : isRecurringEvent
                  ? t("recurring_event_doesnt_support_seats")
                  : undefined
              }
              onCheckedChange={(e) => {
                if (e) {
                  toggleGuests(false);
                  formMethods.setValue("requiresConfirmation", false, { shouldDirty: true });
                  formMethods.setValue("metadata.multipleDuration", undefined, { shouldDirty: true });
                  formMethods.setValue("seatsPerTimeSlot", eventType.seatsPerTimeSlot ?? 2, {
                    shouldDirty: true,
                  });
                } else {
                  formMethods.setValue("seatsPerTimeSlot", null);
                  toggleGuests(true);
                }
                onChange(e);
              }}
              fieldPermissions={fieldPermissions}
              fieldName="seatsPerTimeSlotEnabled"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="seatsPerTimeSlotEnabled"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }>
              <CardContent className="border-subtle rounded-b-lg border border-t-0">
                <Controller
                  name="seatsPerTimeSlot"
                  render={({ field: { value: seatValue, onChange: seatOnChange } }) => (
                    <div>
                      <TextField
                        required
                        name="seatsPerTimeSlot"
                        labelSrOnly
                        label={t("number_of_seats")}
                        type="number"
                        value={seatValue > MAX_SEATS_PER_TIME_SLOT ? MAX_SEATS_PER_TIME_SLOT : seatValue ?? 1}
                        step={1}
                        placeholder="1"
                        min={1}
                        max={MAX_SEATS_PER_TIME_SLOT}
                        containerClassName="max-w-80"
                        addOnSuffix={t("seats")}
                        onChange={(e) => {
                          const enteredValue = parseInt(e.target.value);
                          seatOnChange(Math.min(enteredValue, MAX_SEATS_PER_TIME_SLOT));
                        }}
                        data-testid="seats-per-time-slot"
                      />

                      {/* Seats visibility options */}
                      <div className="mt-4 space-y-2">
                        <Controller
                          name="seatsShowAttendees"
                          render={({ field: { value: attendeeValue, onChange: attendeeOnChange } }) => (
                            <div className="flex items-center gap-2">
                              <CheckboxField checked={attendeeValue} onCheckedChange={attendeeOnChange} />
                              <Label className="text-foreground text-sm">{t("show_attendees")}</Label>
                            </div>
                          )}
                        />

                        <Controller
                          name="seatsShowAvailabilityCount"
                          render={({ field: { value: availValue, onChange: availOnChange } }) => (
                            <div className="flex items-center gap-2">
                              <CheckboxField checked={availValue} onCheckedChange={availOnChange} />
                              <Label className="text-foreground text-sm">
                                {t("show_available_seats_count")}
                              </Label>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  )}
                />
              </CardContent>
            </SettingsToggle>

            {noShowFeeEnabled && <Alert severity="warning" title={t("seats_and_no_show_fee_error")} />}
          </>
        )}
      />

      {/* Privacy and Communication Settings */}
      <Controller
        name="hideOrganizerEmail"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("hide_organizer_email")}
            description={t("hide_organizer_email_description")}
            checked={value}
            onCheckedChange={onChange}
            data-testid="hide-organizer-email"
            fieldPermissions={fieldPermissions}
            fieldName="hideOrganizerEmail"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="hideOrganizerEmail"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      {/* Timezone Lock Setting */}
      <Controller
        name="lockTimeZoneToggleOnBookingPage"
        render={({ field: { value, onChange } }) => {
          const currentLockedTimeZone = formMethods.getValues("lockedTimeZone");
          const showSelector =
            value &&
            (!(eventType.lockTimeZoneToggleOnBookingPage && !eventType.lockedTimeZone) ||
              !!currentLockedTimeZone);

          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(showSelector && "rounded-b-none")}
              title={t("lock_timezone_toggle_on_booking_page")}
              description={t("description_lock_timezone_toggle_on_booking_page")}
              checked={value}
              onCheckedChange={(e) => {
                onChange(e);
                const lockedTimeZone = e ? eventType.lockedTimeZone ?? "Europe/London" : null;
                formMethods.setValue("lockedTimeZone", lockedTimeZone, { shouldDirty: true });
              }}
              data-testid="lock-timezone-toggle"
              childrenClassName="lg:ml-0"
              fieldPermissions={fieldPermissions}
              fieldName="lockTimeZoneToggleOnBookingPage"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="lockTimeZoneToggleOnBookingPage"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }>
              {showSelector && (
                <div>
                  <Controller
                    name="lockedTimeZone"
                    control={formMethods.control}
                    render={({ field: { value: timezoneValue } }) => (
                      <>
                        <label className="text-default mb-2 block text-sm font-medium">{t("timezone")}</label>
                        <TimezoneSelect
                          id="lockedTimeZone"
                          value={timezoneValue ?? "Europe/London"}
                          onChange={(event) => {
                            if (event)
                              formMethods.setValue("lockedTimeZone", event.value, { shouldDirty: true });
                          }}
                        />
                      </>
                    )}
                  />
                </div>
              )}
            </SettingsToggle>
          );
        }}
      />

      {/* Rescheduling Settings */}
      <Controller
        name="allowReschedulingPastBookings"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("allow_rescheduling_past_events")}
            description={t("allow_rescheduling_past_events_description")}
            checked={value}
            onCheckedChange={onChange}
            fieldPermissions={fieldPermissions}
            fieldName="allowReschedulingPastBookings"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="allowReschedulingPastBookings"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      <Controller
        name="allowReschedulingCancelledBookings"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("allow_rescheduling_cancelled_bookings")}
            data-testid="allow-rescheduling-cancelled-bookings-toggle"
            description={t("description_allow_rescheduling_cancelled_bookings")}
            checked={value || false}
            onCheckedChange={onChange}
            fieldPermissions={fieldPermissions}
            fieldName="allowReschedulingCancelledBookings"
            lockedIcon={
              <FieldPermissionIndicator
                fieldName="allowReschedulingCancelledBookings"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
          />
        )}
      />

      {/* Custom Reply-To Email */}
      {!isPlatform && (
        <Controller
          name="customReplyToEmail"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(customReplyToEmailVisible && "rounded-b-none")}
              childrenClassName="lg:ml-0"
              title={t("custom_reply_to_email_title")}
              data-testid="custom-reply-to-email"
              description={t("custom_reply_to_email_description")}
              checked={customReplyToEmailVisible}
              onCheckedChange={(e) => {
                if (e) {
                  onChange(value || verifiedEmails?.[0] || "");
                } else {
                  onChange(null);
                }
                setCustomReplyToEmailVisible(e);
              }}
              fieldPermissions={fieldPermissions}
              fieldName="customReplyToEmail"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="customReplyToEmail"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }>
              {verifiedEmails && verifiedEmails.length === 0 ? (
                <p className="text-destructive text-sm">{t("custom_reply_to_email_no_verified_emails")}</p>
              ) : (
                <CardContent className="border-subtle rounded-b-lg border border-t-0">
                  <Select
                    value={
                      value
                        ? {
                            value: value,
                            label: value,
                          }
                        : null
                    }
                    onChange={(option) => {
                      console.log("Option: ", option);
                      onChange(option?.value || null);
                    }}
                    options={
                      verifiedEmails?.map((email) => ({
                        value: email,
                        label: email,
                      })) ?? []
                    }
                    placeholder={t("select_verified_email")}
                    className="w-full"
                  />
                </CardContent>
              )}
            </SettingsToggle>
          )}
        />
      )}

      {/* Round Robin Reschedule Setting */}
      {isRoundRobinEventType && (
        <Controller
          name="rescheduleWithSameRoundRobinHost"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("reschedule_with_same_round_robin_host_title")}
              description={t("reschedule_with_same_round_robin_host_description")}
              checked={value}
              onCheckedChange={onChange}
              fieldPermissions={fieldPermissions}
              fieldName="rescheduleWithSameRoundRobinHost"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="rescheduleWithSameRoundRobinHost"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
            />
          )}
        />
      )}

      {/* Email Notification Controls */}
      {canDisableParticipantNotifications(workflows) && (
        <Controller
          name="metadata.disableStandardEmails.confirmation.attendee"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("disable_attendees_confirmation_emails")}
              description={t("disable_attendees_confirmation_emails_description")}
              checked={value}
              onCheckedChange={onChange}
              fieldPermissions={fieldPermissions}
              fieldName="metadata.disableStandardEmails.confirmation.attendee"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="metadata.disableStandardEmails.confirmation.attendee"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
            />
          )}
        />
      )}

      {canDisableOrganizerNotifications(workflows) && (
        <Controller
          name="metadata.disableStandardEmails.confirmation.host"
          defaultValue={!!formMethods.getValues("seatsPerTimeSlot")}
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("disable_host_confirmation_emails")}
              description={t("disable_host_confirmation_emails_description")}
              checked={value}
              onCheckedChange={onChange}
              fieldPermissions={fieldPermissions}
              fieldName="metadata.disableStandardEmails.confirmation.host"
              lockedIcon={
                <FieldPermissionIndicator
                  fieldName="metadata.disableStandardEmails.confirmation.host"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
            />
          )}
        />
      )}

      {/* Disable All Emails for Team Events */}
      {team?.parentId && (
        <>
          <Controller
            name="metadata.disableStandardEmails.all.attendee"
            render={({ field: { value, onChange } }) => (
              <DisableAllEmailsSetting
                checked={value}
                onCheckedChange={onChange}
                recipient="attendees"
                t={t}
              />
            )}
          />
          <Controller
            name="metadata.disableStandardEmails.all.host"
            defaultValue={!!formMethods.getValues("seatsPerTimeSlot")}
            render={({ field: { value, onChange } }) => (
              <DisableAllEmailsSetting checked={value} onCheckedChange={onChange} recipient="hosts" t={t} />
            )}
          />
        </>
      )}

      {/* Event Name Customization Modal */}
      {showEventNameTip && (
        <CustomEventNameModal
          close={() => setShowEventNameTip(false)}
          setValue={(val: string) => formMethods.setValue("eventName", val, { shouldDirty: true })}
          defaultValue={formMethods.getValues("eventName")}
          placeHolder={eventNamePlaceholder}
          isNameFieldSplit={isSplit}
          event={eventNameObject}
        />
      )}
    </div>
  );
};
