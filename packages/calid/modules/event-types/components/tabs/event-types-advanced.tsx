// Workflow and notification utilities
import {
  canDisableParticipantNotifications,
  canDisableOrganizerNotifications,
} from "@calid/features/modules/workflows/utils/notificationDisableCheck";
// UI components
import { Alert } from "@calid/features/ui/components/alert";
import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Checkbox } from "@calid/features/ui/components/checkbox";
import { Icon } from "@calid/features/ui/components/icon";
import { Input } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { RadioGroup } from "@calid/features/ui/components/radio-group";
import { RadioGroupItem } from "@calid/features/ui/components/radio-group";
import { Select } from "@calid/features/ui/components/select";
import { SelectTrigger } from "@calid/features/ui/components/select";
import { SelectValue } from "@calid/features/ui/components/select";
import { SelectContent } from "@calid/features/ui/components/select";
import { SelectItem } from "@calid/features/ui/components/select";
import { Switch } from "@calid/features/ui/components/switch/switch";
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
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { TimezoneSelect } from "@calcom/features/components/timezone-select";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { MultiplePrivateLinksController } from "@calcom/features/eventtypes/components";
// Types
import type { FormValues, EventTypeSetup, EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
// Form and booking components
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import type { fieldSchema, EditableSchema } from "@calcom/features/form-builder/schema";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import ServerTrans from "@calcom/lib/components/ServerTrans";
// Constants and utilities
import {
  DEFAULT_LIGHT_BRAND_COLOR,
  DEFAULT_DARK_BRAND_COLOR,
  MAX_SEATS_PER_TIME_SLOT,
} from "@calcom/lib/constants";
import { getEventName, validateCustomEventName } from "@calcom/lib/event";
import type { EventNameObjectType } from "@calcom/lib/event";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { TextField, ColorPicker } from "@calcom/ui/components/form";

type BookingField = z.infer<typeof fieldSchema>;

/**
 * Props interface for the EventAdvanced component
 * Defines all required data and callback functions for advanced event type configuration
 */
export interface EventAdvancedProps {
  eventType: EventTypeSetup;
  team?: EventTypeSetupProps["team"];
  user?: Partial<
    Pick<
      RouterOutputs["viewer"]["me"]["get"],
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

/**
 * Reusable toggle component with consistent styling and behavior
 * Used throughout the form for boolean settings with optional child content
 */
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
  toggleSwitchAtTheEnd = true,
  "data-testid": dataTestId,
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
}) => {
  return (
    <div className={classNames("border-subtle bg-default rounded-lg border", switchContainerClassName)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-8">
          <h3
            className={classNames(
              "mb-2 flex items-center text-sm font-medium text-gray-700",
              labelClassName
            )}>
            {title}
            {lockedIcon}
            {tooltip && (
              <button className="group relative ml-2 rounded-full p-1 hover:bg-gray-100" title={tooltip}>
                <Icon name="info" className="h-4 w-4 text-gray-400" />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-800 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {tooltip}
                </div>
              </button>
            )}
          </h3>
          {description && (
            <p className={classNames("text-sm text-gray-600", descriptionClassName)}>{description}</p>
          )}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          data-testid={dataTestId}
        />
      </div>
      {checked && children && (
        <div className={classNames("border-muted border-t pt-6", childrenClassName)}>{children}</div>
      )}
    </div>
  );
};

/**
 * Modal for customizing event names with variable support
 * Allows users to create dynamic event names using predefined variables
 */
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
      <DialogContent
        title={t("custom_event_name")}
        description={t("custom_event_name_description")}
        type="creation"
        enableOverflow>
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
            className="mb-0"
          />

          <div className="pt-6 text-sm">
            <div className="bg-subtle mb-6 rounded-md p-2">
              <h1 className="text-emphasis mb-2 ml-1 font-medium">{t("available_variables")}</h1>
              <div className="scroll-bar h-[216px] overflow-y-auto">
                {variableDefinitions.map((variable, index) => (
                  <div key={index} className="mb-2.5 flex font-normal">
                    <p className="text-subtle ml-1 mr-5 w-32">{variable.key}</p>
                    <p className="text-emphasis">{variable.description}</p>
                  </div>
                ))}

                {event.bookingFields && (
                  <>
                    <p className="text-subtle mb-2 ml-1 font-medium">
                      {t("booking_question_response_variables")}
                    </p>
                    {Object.entries(event.bookingFields).map(([fieldName, fieldValue], index) => (
                      <div key={index} className="mb-2.5 flex font-normal">
                        <p className="text-subtle ml-1 mr-5 w-32">{`{${fieldName}}`}</p>
                        <p className="text-emphasis capitalize">{fieldValue?.toString()}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Calendar Preview */}
            <h1 className="mb-2 text-[14px] font-medium leading-4">{t("preview")}</h1>
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
          <DialogClose>{t("cancel")}</DialogClose>
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
  eventNameLocked,
  eventNamePlaceholder,
  setShowEventNameTip,
  verifiedSecondaryEmails,
  userEmail,
  isTeamEventType,
  showToast,
}: {
  showConnectedCalendarSettings: boolean;
  calendarsQuery: any;
  eventNameLocked: any;
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
    <div className="border-subtle space-y-6 rounded-lg border p-6">
      <div className="space-y-2">
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

        {/* Secondary email selector for non-team event types */}
        {!useEventTypeDestinationCalendarEmail && verifiedSecondaryEmails.length > 0 && !isTeamEventType && (
          <div className={classNames("flex w-full flex-col", showConnectedCalendarSettings && "pl-11")}>
            <Label className="text-foreground mb-1 text-sm">{t("add_to_calendar")}</Label>
            <Select
              value={selectedSecondaryEmailId !== -1 ? String(selectedSecondaryEmailId) : ""}
              onValueChange={(val) =>
                formMethods.setValue("secondaryEmailId", val ? Number(val) : -1, { shouldDirty: true })
              }>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    selectedSecondaryEmailId === -1 && (
                      <span className="text-default min-w-0 overflow-hidden truncate whitespace-nowrap">
                        <Badge variant="default">{t("default")}</Badge> {userEmail}
                      </span>
                    )
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {verifiedSecondaryEmails.map((secondaryEmail) => (
                  <SelectItem key={secondaryEmail.value} value={String(secondaryEmail.value)}>
                    {secondaryEmail.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-subtle mt-2 text-sm">{t("display_email_as_organizer")}</p>
          </div>
        )}
      </div>

      {/* Calendar and Event Name Configuration */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
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

        <div className="w-full">
          <TextField
            label={t("event_name_in_calendar")}
            type="text"
            {...eventNameLocked}
            placeholder={eventNamePlaceholder}
            {...formMethods.register("eventName")}
            addOnSuffix={
              <Button
                color="minimal"
                size="sm"
                aria-label="edit custom name"
                className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
                onClick={() => setShowEventNameTip((old) => !old)}>
                <Icon name="pencil" className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Calendar integration settings with loading states
 * Manages calendar connections and selected calendar scope
 */
const CalendarSettings = ({
  eventType,
  calendarsQuery,
  verifiedSecondaryEmails,
  userEmail,
  isTeamEventType,
  isChildrenManagedEventType,
  eventNameLocked,
  eventNamePlaceholder,
  setShowEventNameTip,
  showToast,
}: any) => {
  const formMethods = useFormContext<FormValues>();
  const isPlatform = useIsPlatform();

  const isConnectedCalendarSettingsApplicable = !isTeamEventType || isChildrenManagedEventType;
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
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          <div className="flex w-full flex-col">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-4 w-48 animate-pulse rounded-md" />
          </div>
          <div className="w-full">
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-10 w-full animate-pulse rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="bg-emphasis h-6 w-64 animate-pulse rounded-md" />
          <div className="bg-emphasis h-10 w-full animate-pulse rounded-md" />
          <div className="bg-emphasis h-4 w-48 animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DestinationCalendarSettings
        verifiedSecondaryEmails={verifiedSecondaryEmails}
        userEmail={userEmail}
        isTeamEventType={isTeamEventType}
        calendarsQuery={calendarsQuery}
        eventNameLocked={eventNameLocked}
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
  eventType,
  seatsEnabled,
  metadata,
  requiresConfirmation,
  requiresConfirmationWillBlockSlot,
  onRequiresConfirmation,
}: {
  eventType: any;
  seatsEnabled: boolean;
  metadata: any;
  requiresConfirmation: boolean;
  requiresConfirmationWillBlockSlot?: boolean;
  onRequiresConfirmation: (value: boolean) => void;
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [requiresConfirmationSetup, setRequiresConfirmationSetup] = useState(
    metadata?.requiresConfirmationThreshold
  );

  const defaultRequiresConfirmationSetup = { time: 30, unit: "minutes" as UnitTypeLongPlural };

  const { shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const requiresConfirmationLocked = shouldLockDisableProps("requiresConfirmation");

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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                requiresConfirmation && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("requires_confirmation")}
              data-testid="requires-confirmation"
              disabled={seatsEnabled || requiresConfirmationLocked.disabled}
              tooltip={seatsEnabled ? t("seat_options_doesnt_support_confirmation") : undefined}
              description={t("requires_confirmation_description")}
              checked={requiresConfirmation}
              lockedIcon={requiresConfirmationLocked.LockedIcon}
              onCheckedChange={handleConfirmationChange}>
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
                    {(requiresConfirmationSetup === undefined || !requiresConfirmationLocked.disabled) && (
                      <div className="flex items-center">
                        <RadioGroupItem
                          value="always"
                          id="always"
                          disabled={requiresConfirmationLocked.disabled}
                          className="mr-2"
                        />
                        <label htmlFor="always" className="text-sm">
                          {t("always")}
                        </label>
                      </div>
                    )}

                    {/* Conditional confirmation with time threshold */}
                    {(requiresConfirmationSetup !== undefined || !requiresConfirmationLocked.disabled) && (
                      <>
                        <div className="flex items-center">
                          <RadioGroupItem
                            value="notice"
                            id="notice"
                            disabled={requiresConfirmationLocked.disabled}
                            className="mr-2"
                          />
                          <label htmlFor="notice" className="flex items-center space-x-2 text-sm">
                            <ServerTrans
                              t={t}
                              i18nKey="when_booked_with_less_than_notice"
                              components={[
                                <div
                                  key="when_booked_with_less_than_notice"
                                  className="mx-2 inline-flex items-center">
                                  <Input
                                    type="number"
                                    min={1}
                                    disabled={requiresConfirmationLocked.disabled}
                                    onChange={(evt) => {
                                      const val = Number(evt.target?.value);
                                      handleTimeChange(val);
                                    }}
                                    className="border-default !m-0 block h-9 w-16 rounded-r-none border border-r-0 text-sm [appearance:textfield] focus:z-10"
                                    defaultValue={metadata?.requiresConfirmationThreshold?.time || 30}
                                  />

                                  <label
                                    className={classNames(
                                      requiresConfirmationLocked.disabled && "cursor-not-allowed"
                                    )}>
                                    <Select
                                      defaultValue={defaultValue?.value}
                                      onValueChange={(val) => {
                                        if (val) {
                                          handleUnitChange(val as UnitTypeLongPlural);
                                        }
                                      }}
                                      disabled={requiresConfirmationLocked.disabled}>
                                      <SelectTrigger
                                        id="notice"
                                        className="border-default h-9 w-auto rounded-l-none border px-3 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {timeUnitOptions.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </label>
                                </div>,
                              ]}
                            />
                          </label>
                        </div>

                        {/* Additional confirmation options */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={requiresConfirmationWillBlockSlot}
                            onCheckedChange={(checked) => {
                              formMethods.setValue("requiresConfirmationWillBlockSlot", !!checked, {
                                shouldDirty: true,
                              });
                            }}
                          />
                          <label className="text-foreground text-sm">
                            {t("requires_confirmation_will_block_slot_description")}
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formMethods.getValues("requiresConfirmationForFreeEmail")}
                            onCheckedChange={(checked) => {
                              formMethods.setValue("requiresConfirmationForFreeEmail", !!checked, {
                                shouldDirty: true,
                              });
                            }}
                          />
                          <label className="text-foreground text-sm">
                            {t("require_confirmation_for_free_email")}
                          </label>
                        </div>
                      </>
                    )}
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
        labelClassName="text-sm"
        toggleSwitchAtTheEnd={true}
        switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
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

  // Fetch verified emails for the team or user
  const { data: verifiedEmails } = trpc.viewer.workflows.calid_getVerifiedEmails.useQuery({
    calIdTeamId: team?.id,
  });

  // UI state management
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);

  // Toggle visibility states for conditional sections
  const [multiplePrivateLinksVisible, setMultiplePrivateLinksVisible] = useState(
    !!formMethods.getValues("multiplePrivateLinks")?.length
  );
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));
  const [customReplyToEmailVisible, setCustomReplyToEmailVisible] = useState(
    !!formMethods.getValues("customReplyToEmail")
  );

  // Watch form values for reactive UI updates
  const requiresConfirmation = formMethods.watch("requiresConfirmation") || false;
  const isEventTypeColorChecked = !!formMethods.watch("eventTypeColor");
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  // Derived state from form values
  const workflows = eventType.workflows.map((workflowOnEventType: any) => workflowOnEventType.workflow);
  const multiLocation = (formMethods.getValues("locations") || []).length > 1;
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";
  const isRecurringEvent = !!formMethods.getValues("recurringEvent");
  const isRoundRobinEventType = eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  // Initialize locked fields manager for permission control
  const { isChildrenManagedEventType, isManagedEventType, shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  // Memoize locked field states to prevent recalculation
  const lockedFields = useMemo(
    () => ({
      successRedirectUrl: shouldLockDisableProps("successRedirectUrl"),
      seats: shouldLockDisableProps("seatsPerTimeSlotEnabled"),
      requiresBookerEmailVerification: shouldLockDisableProps("requiresBookerEmailVerification"),
      sendCalVideoTranscriptionEmails: shouldLockDisableProps("canSendCalVideoTranscriptionEmails"),
      hideCalendarNotes: shouldLockDisableProps("hideCalendarNotes"),
      hideCalendarEventDetails: shouldLockDisableProps("hideCalendarEventDetails"),
      eventTypeColor: shouldLockDisableProps("eventTypeColor"),
      lockTimeZoneToggleOnBookingPage: shouldLockDisableProps("lockTimeZoneToggleOnBookingPage"),
      multiplePrivateLinks: shouldLockDisableProps("multiplePrivateLinks"),
      reschedulingPastBookings: shouldLockDisableProps("allowReschedulingPastBookings"),
      hideOrganizerEmail: shouldLockDisableProps("hideOrganizerEmail"),
      customReplyToEmail: shouldLockDisableProps("customReplyToEmail"),
      disableCancelling: shouldLockDisableProps("disableCancelling"),
      disableRescheduling: shouldLockDisableProps("disableRescheduling"),
      allowReschedulingCancelledBookings: shouldLockDisableProps("allowReschedulingCancelledBookings"),
      eventName: shouldLockDisableProps("eventName"),
    }),
    [shouldLockDisableProps]
  );

  // Apply managed event type restrictions
  if (isManagedEventType) {
    lockedFields.multiplePrivateLinks.disabled = true;
  }

  // Process booking fields for event name object
  const bookingFields: any = {};
  formMethods.getValues().bookingFields.forEach(({ name }: any) => {
    bookingFields[name] = `${name} input`;
  });

  const nameBookingField = formMethods.getValues().bookingFields.find((field) => field.name === "name");
  const isSplit = nameBookingField?.variant === "firstAndLastName";

  // Create event name object for preview and validation
  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: formMethods.getValues("title"),
    eventName: formMethods.getValues("eventName"),
    host: formMethods.getValues("users")[0]?.name || "Nameless",
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
    teamId: eventType.teamId,
    hosts: eventType.hosts,
    owner: eventType.owner,
    team: eventType.team,
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
      ...(user?.secondaryEmails || [])
        .filter((secondaryEmail) => secondaryEmail.emailVerified)
        .map((secondaryEmail) => ({ label: secondaryEmail.email, value: secondaryEmail.id })),
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

  // Initialize event type color state
  const currentEventTypeColor = formMethods.watch("eventTypeColor");
  const eventTypeColorState = currentEventTypeColor || {
    lightEventTypeColor: DEFAULT_LIGHT_BRAND_COLOR,
    darkEventTypeColor: DEFAULT_DARK_BRAND_COLOR,
  };

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
        bookingFields.map((field: any) => {
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
        isChildrenManagedEventType={isChildrenManagedEventType}
        eventNameLocked={lockedFields.eventName}
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
      <div className="border-subtle rounded-lg border p-1">
        <div className="p-5">
          <div className="text-default text-sm font-semibold leading-none ltr:mr-1 rtl:ml-1">
            {t("booking_questions_title")}
          </div>
          <p className="text-subtle mt-1 max-w-[280px] break-words text-sm sm:max-w-[500px]">
            {t("booking_questions_description")}
          </p>
        </div>
        <div className="px-3 pb-3">
          <div className="border-subtle bg-default rounded-lg border p-5">
            <FormBuilder
              showPhoneAndEmailToggle
              title={t("confirmation")}
              description={t("what_booker_should_provide")}
              addFieldLabel={t("add_a_booking_question")}
              formProp="bookingFields"
              {...shouldLockDisableProps("bookingFields")}
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
          </div>
        </div>
      </div>

      {/* Confirmation Requirements */}
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        requiresConfirmationWillBlockSlot={formMethods.getValues("requiresConfirmationWillBlockSlot")}
        onRequiresConfirmation={(value) => {
          formMethods.setValue("requiresConfirmation", value, { shouldDirty: true });
        }}
      />

      {/* Cancellation and Rescheduling Controls */}
      {!isPlatform && (
        <>
          <Controller
            name="disableCancelling"
            render={({ field: { value, onChange } }) => (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_cancelling")}
                data-testid="disable-cancelling-toggle"
                disabled={lockedFields.disableCancelling.disabled}
                lockedIcon={lockedFields.disableCancelling.LockedIcon}
                description={t("description_disable_cancelling")}
                checked={value || false}
                onCheckedChange={onChange}
              />
            )}
          />

          <Controller
            name="disableRescheduling"
            render={({ field: { value, onChange } }) => (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_rescheduling")}
                data-testid="disable-rescheduling-toggle"
                disabled={lockedFields.disableRescheduling.disabled}
                lockedIcon={lockedFields.disableRescheduling.LockedIcon}
                description={t("description_disable_rescheduling")}
                checked={value || false}
                onCheckedChange={onChange}
              />
            )}
          />
        </>
      )}

      {/* Video Transcription Emails */}
      <Controller
        name="canSendCalVideoTranscriptionEmails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("send_cal_video_transcription_emails")}
            data-testid="send-cal-video-transcription-emails"
            disabled={lockedFields.sendCalVideoTranscriptionEmails.disabled}
            lockedIcon={lockedFields.sendCalVideoTranscriptionEmails.LockedIcon}
            description={t("description_send_cal_video_transcription_emails")}
            checked={value}
            onCheckedChange={onChange}
          />
        )}
      />

      {/* Email Verification Requirement */}
      <Controller
        name="requiresBookerEmailVerification"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("requires_booker_email_verification")}
            data-testid="requires-booker-email-verification"
            disabled={lockedFields.requiresBookerEmailVerification.disabled}
            lockedIcon={lockedFields.requiresBookerEmailVerification.LockedIcon}
            description={t("description_requires_booker_email_verification")}
            checked={value}
            onCheckedChange={onChange}
          />
        )}
      />

      {/* Calendar Privacy Settings */}
      <Controller
        name="hideCalendarNotes"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            data-testid="disable-notes"
            title={t("disable_notes")}
            disabled={lockedFields.hideCalendarNotes.disabled}
            lockedIcon={lockedFields.hideCalendarNotes.LockedIcon}
            description={t("disable_notes_description")}
            checked={value}
            onCheckedChange={onChange}
          />
        )}
      />

      <Controller
        name="hideCalendarEventDetails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("hide_calendar_event_details")}
            disabled={lockedFields.hideCalendarEventDetails.disabled}
            lockedIcon={lockedFields.hideCalendarEventDetails.LockedIcon}
            description={t("description_hide_calendar_event_details")}
            checked={value}
            onCheckedChange={onChange}
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
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              redirectUrlVisible && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            title={t("redirect_success_booking")}
            data-testid="redirect-success-booking"
            disabled={lockedFields.successRedirectUrl.disabled}
            lockedIcon={lockedFields.successRedirectUrl.LockedIcon}
            description={t("redirect_url_description")}
            checked={redirectUrlVisible}
            onCheckedChange={(e) => {
              field.onChange(e ? field.value || "" : "");
              setRedirectUrlVisible(e);
            }}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <TextField
                className="w-full"
                label={t("redirect_success_booking")}
                labelSrOnly
                disabled={lockedFields.successRedirectUrl.disabled}
                placeholder={t("external_redirect_url")}
                data-testid="external-redirect-url"
                required={redirectUrlVisible}
                type="text"
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />

              {fieldState.error && <p className="mt-2 text-sm text-red-600">{fieldState.error.message}</p>}

              <div className="mt-4">
                <Controller
                  name="forwardParamsSuccessRedirect"
                  render={({ field: { value: forwardValue, onChange: forwardOnChange } }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={forwardValue}
                        disabled={lockedFields.successRedirectUrl.disabled}
                        onCheckedChange={forwardOnChange}
                      />
                      <Label className="text-foreground text-sm">{t("forward_params_redirect")}</Label>
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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                multiplePrivateLinksVisible && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              data-testid="multiplePrivateLinksCheck"
              title={t("multiple_private_links_title")}
              disabled={lockedFields.multiplePrivateLinks.disabled}
              lockedIcon={lockedFields.multiplePrivateLinks.LockedIcon}
              description={t("multiple_private_links_description")}
              tooltip={isManagedEventType ? t("managed_event_field_parent_control_disabled") : ""}
              checked={multiplePrivateLinksVisible}
              onCheckedChange={(e) => {
                if (!e) {
                  onChange([]);
                } else {
                  const newLink = generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id);
                  onChange([newLink]);
                }
                setMultiplePrivateLinksVisible(e);
              }}>
              {!isManagedEventType && (
                <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                  <MultiplePrivateLinksController
                    team={team ?? null}
                    bookerUrl={eventType.bookerUrl}
                    userTimeZone={userTimeZone}
                    setMultiplePrivateLinksVisible={setMultiplePrivateLinksVisible}
                  />
                </div>
              )}
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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                value && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              data-testid="offer-seats-toggle"
              title={t("offer_seats")}
              disabled={
                noShowFeeEnabled ||
                multiLocation ||
                (!seatsEnabled && isRecurringEvent) ||
                lockedFields.seats.disabled
              }
              lockedIcon={lockedFields.seats.LockedIcon}
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
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
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
                        disabled={lockedFields.seats.disabled}
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
                              <Checkbox
                                data-testid="show-attendees"
                                checked={attendeeValue}
                                disabled={lockedFields.seats.disabled}
                                onCheckedChange={attendeeOnChange}
                              />
                              <Label className="text-foreground text-sm">{t("show_attendees")}</Label>
                            </div>
                          )}
                        />

                        <Controller
                          name="seatsShowAvailabilityCount"
                          render={({ field: { value: availValue, onChange: availOnChange } }) => (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={availValue}
                                disabled={lockedFields.seats.disabled}
                                onCheckedChange={availOnChange}
                              />
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
              </div>
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
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("hide_organizer_email")}
            disabled={lockedFields.hideOrganizerEmail.disabled}
            lockedIcon={lockedFields.hideOrganizerEmail.LockedIcon}
            description={t("hide_organizer_email_description")}
            checked={value}
            onCheckedChange={onChange}
            data-testid="hide-organizer-email"
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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                showSelector && "rounded-b-none"
              )}
              title={t("lock_timezone_toggle_on_booking_page")}
              disabled={lockedFields.lockTimeZoneToggleOnBookingPage.disabled}
              lockedIcon={lockedFields.lockTimeZoneToggleOnBookingPage.LockedIcon}
              description={t("description_lock_timezone_toggle_on_booking_page")}
              checked={value}
              onCheckedChange={(e) => {
                onChange(e);
                const lockedTimeZone = e ? eventType.lockedTimeZone ?? "Europe/London" : null;
                formMethods.setValue("lockedTimeZone", lockedTimeZone, { shouldDirty: true });
              }}
              data-testid="lock-timezone-toggle"
              childrenClassName="lg:ml-0">
              {showSelector && (
                <div className="border-subtle flex flex-col gap-6 rounded-b-lg border border-t-0 p-6">
                  <div>
                    <Controller
                      name="lockedTimeZone"
                      control={formMethods.control}
                      render={({ field: { value: timezoneValue } }) => (
                        <>
                          <label className="text-default mb-2 block text-sm font-medium">
                            {t("timezone")}
                          </label>
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
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("allow_rescheduling_past_events")}
            disabled={lockedFields.reschedulingPastBookings.disabled}
            lockedIcon={lockedFields.reschedulingPastBookings.LockedIcon}
            description={t("allow_rescheduling_past_events_description")}
            checked={value}
            onCheckedChange={onChange}
          />
        )}
      />

      <Controller
        name="allowReschedulingCancelledBookings"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("allow_rescheduling_cancelled_bookings")}
            data-testid="allow-rescheduling-cancelled-bookings-toggle"
            disabled={lockedFields.allowReschedulingCancelledBookings.disabled}
            lockedIcon={lockedFields.allowReschedulingCancelledBookings.LockedIcon}
            description={t("description_allow_rescheduling_cancelled_bookings")}
            checked={value || false}
            onCheckedChange={onChange}
          />
        )}
      />

      {/* Custom Reply-To Email */}
      {!isPlatform && (
        <Controller
          name="customReplyToEmail"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                customReplyToEmailVisible && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("custom_reply_to_email_title")}
              disabled={lockedFields.customReplyToEmail.disabled}
              lockedIcon={lockedFields.customReplyToEmail.LockedIcon}
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
              }}>
              {verifiedEmails && verifiedEmails.length === 0 ? (
                <p className="text-destructive text-sm">{t("custom_reply_to_email_no_verified_emails")}</p>
              ) : (
                <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                  <Select value={value || ""} onValueChange={(val) => onChange(val || null)}>
                    <SelectTrigger
                      className="w-full"
                      data-testid="custom-reply-to-email-input"
                      aria-label={t("custom_reply_to_email_title")}>
                      <SelectValue placeholder={t("select_verified_email")} />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedEmails?.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </SettingsToggle>
          )}
        />
      )}

      {/* Event Type Color Configuration */}
      <Controller
        name="eventTypeColor"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              isEventTypeColorChecked && "rounded-b-none"
            )}
            title={t("event_type_color")}
            disabled={lockedFields.eventTypeColor.disabled}
            lockedIcon={lockedFields.eventTypeColor.LockedIcon}
            description={t("event_type_color_description")}
            checked={isEventTypeColorChecked}
            onCheckedChange={(e) => {
              const newValue = e ? eventTypeColorState : null;
              onChange(newValue);
            }}
            childrenClassName="lg:ml-0">
            <div className="border-subtle flex flex-col gap-6 rounded-b-lg border border-t-0 p-6">
              <div>
                <p className="text-default mb-2 block text-sm font-medium">{t("light_event_type_color")}</p>
                <ColorPicker
                  defaultValue={eventTypeColorState.lightEventTypeColor}
                  onChange={(newColor) => {
                    const newVal = {
                      ...eventTypeColorState,
                      lightEventTypeColor: newColor,
                    };
                    onChange(newVal);
                    setLightModeError(!checkWCAGContrastColor("#ffffff", newColor));
                  }}
                />
                {lightModeError && (
                  <div className="mt-4">
                    <Alert severity="warning" message={t("event_type_color_light_theme_contrast_error")} />
                  </div>
                )}
              </div>

              <div className="mt-6 sm:mt-0">
                <p className="text-default mb-2 block text-sm font-medium">{t("dark_event_type_color")}</p>
                <ColorPicker
                  defaultValue={eventTypeColorState.darkEventTypeColor}
                  onChange={(newColor) => {
                    const newVal = {
                      ...eventTypeColorState,
                      darkEventTypeColor: newColor,
                    };
                    onChange(newVal);
                    setDarkModeError(!checkWCAGContrastColor("#101010", newColor));
                  }}
                />
                {darkModeError && (
                  <div className="mt-4">
                    <Alert severity="warning" message={t("event_type_color_dark_theme_contrast_error")} />
                  </div>
                )}
              </div>
            </div>
          </SettingsToggle>
        )}
      />

      {/* Round Robin Reschedule Setting */}
      {isRoundRobinEventType && (
        <Controller
          name="rescheduleWithSameRoundRobinHost"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
              title={t("reschedule_with_same_round_robin_host_title")}
              description={t("reschedule_with_same_round_robin_host_description")}
              checked={value}
              onCheckedChange={onChange}
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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
              title={t("disable_attendees_confirmation_emails")}
              description={t("disable_attendees_confirmation_emails_description")}
              checked={value}
              onCheckedChange={onChange}
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
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
              title={t("disable_host_confirmation_emails")}
              description={t("disable_host_confirmation_emails_description")}
              checked={value}
              onCheckedChange={onChange}
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
