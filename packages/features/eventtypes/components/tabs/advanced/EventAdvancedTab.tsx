import { useState, Suspense, useMemo, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { z } from "zod";

import { getPaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import { useAtomsContext } from "@calcom/atoms/hooks/useAtomsContext";
import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import {
  SelectedCalendarsSettingsWebWrapper,
  SelectedCalendarSettingsScope,
  SelectedCalendarsSettingsWebWrapperSkeleton,
} from "@calcom/atoms/selected-calendars/wrappers/SelectedCalendarsSettingsWebWrapper";
import { Timezone as PlatformTimzoneSelect } from "@calcom/atoms/timezone";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { TimezoneSelect as WebTimezoneSelect } from "@calcom/features/components/timezone-select";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { MultiplePrivateLinksController } from "@calcom/features/eventtypes/components";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import { getEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import type {
  FormValues,
  EventTypeSetupProps,
  SelectClassNames,
  CheckboxClassNames,
  InputClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import {
  DEFAULT_LIGHT_BRAND_COLOR,
  DEFAULT_DARK_BRAND_COLOR,
  APP_NAME,
  MAX_SEATS_PER_TIME_SLOT,
} from "@calcom/lib/constants";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { extractHostTimezone } from "@calcom/lib/hashedLinksUtils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EditableSchema } from "@calcom/prisma/zod-utils";
import type { fieldSchema } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  SelectField,
  ColorPicker,
  TextField,
  Label,
  CheckboxField,
  Switch,
  SettingsToggle,
  Select,
} from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import AddVerifiedEmail from "../../AddVerifiedEmail";
import type { CustomEventTypeModalClassNames } from "./CustomEventTypeModal";
import CustomEventTypeModal from "./CustomEventTypeModal";
import type { EmailNotificationToggleCustomClassNames } from "./DisableAllEmailsSetting";
import { DisableAllEmailsSetting } from "./DisableAllEmailsSetting";
import type { RequiresConfirmationCustomClassNames } from "./RequiresConfirmationController";
import RequiresConfirmationController from "./RequiresConfirmationController";

export type EventAdvancedTabCustomClassNames = {
  destinationCalendar?: SelectClassNames;
  eventName?: InputClassNames;
  customEventTypeModal?: CustomEventTypeModalClassNames;
  addToCalendarEmailOrganizer?: SettingsToggleClassNames & {
    emailSelect?: {
      container?: string;
      select?: string;
      displayEmailLabel?: string;
    };
  };
  requiresConfirmation?: RequiresConfirmationCustomClassNames;
  bookerEmailVerification?: SettingsToggleClassNames;
  canSendCalVideoTranscriptionEmails?: SettingsToggleClassNames;
  calendarNotes?: SettingsToggleClassNames;
  eventDetailsVisibility?: SettingsToggleClassNames;
  bookingRedirect?: SettingsToggleClassNames & {
    children?: string;
    redirectUrlInput?: InputClassNames;
    forwardParamsCheckbox?: CheckboxClassNames;
    error?: string;
  };
  seatsOptions?: SettingsToggleClassNames & {
    children?: string;
    showAttendeesCheckbox?: CheckboxClassNames;
    showAvalableSeatCountCheckbox?: CheckboxClassNames;
    seatsInput: InputClassNames;
  };
  timezoneLock?: SettingsToggleClassNames;
  hideOrganizerEmail?: SettingsToggleClassNames;
  eventTypeColors?: SettingsToggleClassNames & {
    warningText?: string;
  };
  roundRobinReschedule?: SettingsToggleClassNames;
  customReplyToEmail?: SettingsToggleClassNames;
  emailNotifications?: EmailNotificationToggleCustomClassNames;
};

type BookingField = z.infer<typeof fieldSchema>;

export type EventAdvancedBaseProps = Pick<EventTypeSetupProps, "eventType" | "team"> & {
  user?: Partial<
    Pick<
      RouterOutputs["viewer"]["me"]["get"],
      "email" | "secondaryEmails" | "theme" | "defaultBookerLayouts" | "timeZone"
    >
  >;
  isUserLoading?: boolean;
  showToast: (message: string, variant: "success" | "warning" | "error") => void;
  orgId: number | null;
  customClassNames?: EventAdvancedTabCustomClassNames;
};

export type EventAdvancedTabProps = EventAdvancedBaseProps & {
  calendarsQuery: {
    data?: RouterOutputs["viewer"]["calendars"]["connectedCalendars"];
    isPending: boolean;
    error: unknown;
  };
  showBookerLayoutSelector: boolean;
  localeOptions?: { value: string; label: string }[];
  verifiedEmails?: string[];
};

type CalendarSettingsProps = {
  eventType: EventAdvancedTabProps["eventType"];
  customClassNames?: EventAdvancedTabCustomClassNames;
  calendarsQuery: NonNullable<EventAdvancedTabProps["calendarsQuery"]>;
  eventNameLocked: {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
  eventNamePlaceholder: string;
  setShowEventNameTip: Dispatch<SetStateAction<boolean>>;
  showToast: EventAdvancedTabProps["showToast"];
  verifiedSecondaryEmails: { label: string; value: number }[];
  userEmail: string;
  isTeamEventType: boolean;
  isChildrenManagedEventType: boolean;
};

const destinationCalendarComponents = {
  DestinationCalendarSettings({
    showConnectedCalendarSettings,
    customClassNames,
    calendarsQuery,
    eventNameLocked,
    eventNamePlaceholder,
    setShowEventNameTip,
    verifiedSecondaryEmails,
    userEmail,
    isTeamEventType,
    showToast,
  }: Omit<CalendarSettingsProps, "eventType" | "isChildrenManagedEventType"> & {
    showConnectedCalendarSettings: boolean;
  }) {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();
    const [useEventTypeDestinationCalendarEmail, setUseEventTypeDestinationCalendarEmail] = useState(
      formMethods.getValues("useEventTypeDestinationCalendarEmail")
    );
    const selectedSecondaryEmailId = formMethods.getValues("secondaryEmailId") || -1;
    return (
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          {showConnectedCalendarSettings && (
            <div
              className={classNames(
                "flex w-full flex-col",
                customClassNames?.destinationCalendar?.container
              )}>
              <Label
                className={classNames(
                  "text-emphasis mb-0 font-medium",
                  customClassNames?.destinationCalendar?.label
                )}>
                {t("add_to_calendar")}
              </Label>
              <Controller
                name="destinationCalendar"
                render={({ field: { onChange, value } }) => (
                  <DestinationCalendarSelector
                    value={value ? value.externalId : undefined}
                    onChange={onChange}
                    hidePlaceholder
                    hideAdvancedText
                    calendarsQueryData={calendarsQuery.data}
                    customClassNames={customClassNames?.destinationCalendar}
                  />
                )}
              />
              <p className="text-subtle text-sm">{t("select_which_cal")}</p>
            </div>
          )}
          <div className={classNames("w-full", customClassNames?.eventName?.container)}>
            <TextField
              label={t("event_name_in_calendar")}
              labelClassName={customClassNames?.eventName?.label}
              addOnClassname={customClassNames?.eventName?.addOn}
              className={customClassNames?.eventName?.input}
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
        <div className="space-y-2">
          {showConnectedCalendarSettings && (
            <div className={classNames("w-full", customClassNames?.addToCalendarEmailOrganizer?.container)}>
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
                onCheckedChange={(val) => {
                  setUseEventTypeDestinationCalendarEmail(val);
                  formMethods.setValue("useEventTypeDestinationCalendarEmail", val, {
                    shouldDirty: true,
                  });
                  if (val) {
                    showToast(t("reconnect_calendar_to_use"), "warning");
                  }
                }}
              />
            </div>
          )}
          {!showConnectedCalendarSettings && (
            <p className="text-emphasis mb-2 block text-sm font-medium leading-none">
              {t("add_to_calendar")}
            </p>
          )}
          {!useEventTypeDestinationCalendarEmail &&
            verifiedSecondaryEmails.length > 0 &&
            !isTeamEventType && (
              <div className={classNames("flex w-full flex-col", showConnectedCalendarSettings && "pl-11")}>
                <SelectField
                  placeholder={
                    selectedSecondaryEmailId === -1 && (
                      <span className="text-default min-w-0 overflow-hidden truncate whitespace-nowrap">
                        <Badge variant="blue">{t("default")}</Badge> {userEmail}
                      </span>
                    )
                  }
                  className={customClassNames?.addToCalendarEmailOrganizer?.emailSelect?.select}
                  containerClassName={customClassNames?.addToCalendarEmailOrganizer?.emailSelect?.container}
                  onChange={(option) =>
                    formMethods.setValue("secondaryEmailId", option?.value, { shouldDirty: true })
                  }
                  value={verifiedSecondaryEmails.find(
                    (secondaryEmail) =>
                      selectedSecondaryEmailId !== -1 && secondaryEmail.value === selectedSecondaryEmailId
                  )}
                  options={verifiedSecondaryEmails}
                />
                <p
                  className={classNames(
                    "text-subtle mt-2 text-sm",
                    customClassNames?.addToCalendarEmailOrganizer?.emailSelect?.displayEmailLabel
                  )}>
                  {t("display_email_as_organizer")}
                </p>
              </div>
            )}
        </div>
      </div>
    );
  },
  DestinationCalendarSettingsSkeleton() {
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
  },
};

const calendarComponents = {
  CalendarSettingsSkeleton() {
    return (
      <div>
        <destinationCalendarComponents.DestinationCalendarSettingsSkeleton />
        <SelectedCalendarsSettingsWebWrapperSkeleton />
      </div>
    );
  },

  CalendarSettings({
    eventType,
    calendarsQuery,
    verifiedSecondaryEmails,
    userEmail,
    isTeamEventType,
    isChildrenManagedEventType,
    customClassNames,
    eventNameLocked,
    eventNamePlaceholder,
    setShowEventNameTip,
    showToast,
  }: CalendarSettingsProps) {
    const formMethods = useFormContext<FormValues>();
    /**
     * Only display calendar selector if user has connected calendars AND if it's not
     * a team event. Since we don't have logic to handle each attendee calendar (for now).
     */

    const isPlatform = useIsPlatform();
    const isConnectedCalendarSettingsApplicable = !isTeamEventType || isChildrenManagedEventType;
    const isConnectedCalendarSettingsLoading = calendarsQuery.isPending;
    const showConnectedCalendarSettings =
      !!calendarsQuery.data?.connectedCalendars.length && isConnectedCalendarSettingsApplicable;

    const selectedCalendarSettingsScope = formMethods.getValues("useEventLevelSelectedCalendars")
      ? SelectedCalendarSettingsScope.EventType
      : SelectedCalendarSettingsScope.User;

    const destinationCalendar = calendarsQuery.data?.destinationCalendar;
    if (isConnectedCalendarSettingsLoading && isConnectedCalendarSettingsApplicable) {
      return <calendarComponents.CalendarSettingsSkeleton />;
    }

    return (
      <div>
        <destinationCalendarComponents.DestinationCalendarSettings
          verifiedSecondaryEmails={verifiedSecondaryEmails}
          userEmail={userEmail}
          isTeamEventType={isTeamEventType}
          calendarsQuery={calendarsQuery}
          eventNameLocked={eventNameLocked}
          eventNamePlaceholder={eventNamePlaceholder}
          setShowEventNameTip={setShowEventNameTip}
          showToast={showToast}
          showConnectedCalendarSettings={showConnectedCalendarSettings}
          customClassNames={customClassNames}
        />
        <div>
          {isConnectedCalendarSettingsApplicable
            ? showConnectedCalendarSettings && (
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
              )
            : null}
        </div>
      </div>
    );
  },
};

export const EventAdvancedTab = ({
  eventType,
  team,
  calendarsQuery,
  user,
  isUserLoading,
  showToast,
  showBookerLayoutSelector,
  customClassNames,
  verifiedEmails,
  orgId,
  localeOptions,
}: EventAdvancedTabProps) => {
  const isPlatform = useIsPlatform();
  const platformContext = useAtomsContext();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [multiplePrivateLinksVisible, setMultiplePrivateLinksVisible] = useState(
    !!formMethods.getValues("multiplePrivateLinks") &&
      formMethods.getValues("multiplePrivateLinks")?.length !== 0
  );
  const watchedInterfaceLanguage = formMethods.watch("interfaceLanguage");
  const [interfaceLanguageVisible, setInterfaceLanguageVisible] = useState(
    watchedInterfaceLanguage !== null && watchedInterfaceLanguage !== undefined
  );

  useEffect(() => {
    setInterfaceLanguageVisible(watchedInterfaceLanguage !== null && watchedInterfaceLanguage !== undefined);
  }, [watchedInterfaceLanguage]);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));

  const bookingFields: Prisma.JsonObject = {};
  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);
  const selectedThemeIsDark =
    user?.theme === "dark" ||
    (!user?.theme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  formMethods.getValues().bookingFields.forEach(({ name }) => {
    bookingFields[name] = `${name} input`;
  });

  const nameBookingField = formMethods.getValues().bookingFields.find((field) => field.name === "name");
  const isSplit = (nameBookingField && nameBookingField.variant === "firstAndLastName") ?? false;

  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: formMethods.getValues("title"),
    eventName: formMethods.getValues("eventName"),
    host: formMethods.getValues("users")[0]?.name || "Nameless",
    bookingFields: bookingFields,
    eventDuration: formMethods.getValues("length"),
    t,
  };

  const [requiresConfirmation, setRequiresConfirmation] = useState(
    formMethods.getValues("requiresConfirmation")
  );
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const multiLocation = (formMethods.getValues("locations") || []).length > 1;
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";

  const isRecurringEvent = !!formMethods.getValues("recurringEvent");
  const interfaceLanguageOptions =
    localeOptions && localeOptions.length > 0
      ? [{ label: t("visitors_browser_language"), value: "" }, ...localeOptions]
      : [];

  const isRoundRobinEventType =
    eventType.schedulingType && eventType.schedulingType === SchedulingType.ROUND_ROBIN;

  const toggleGuests = (enabled: boolean) => {
    const bookingFields = formMethods.getValues("bookingFields");
    formMethods.setValue(
      "bookingFields",
      bookingFields.map((field) => {
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
  };

  const { isChildrenManagedEventType, isManagedEventType, shouldLockDisableProps, shouldLockIndicator } =
    useLockedFieldsManager({
      eventType,
      translate: t,
      formMethods,
    });
  const eventNamePlaceholder = getEventName({
    ...eventNameObject,
    eventName: formMethods.watch("eventName"),
  });

  const successRedirectUrlLocked = shouldLockDisableProps("successRedirectUrl");
  const seatsLocked = shouldLockDisableProps("seatsPerTimeSlotEnabled");
  const requiresBookerEmailVerificationProps = shouldLockDisableProps("requiresBookerEmailVerification");
  const sendCalVideoTranscriptionEmailsProps = shouldLockDisableProps("canSendCalVideoTranscriptionEmails");
  const hideCalendarNotesLocked = shouldLockDisableProps("hideCalendarNotes");
  const hideCalendarEventDetailsLocked = shouldLockDisableProps("hideCalendarEventDetails");
  const eventTypeColorLocked = shouldLockDisableProps("eventTypeColor");
  const lockTimeZoneToggleOnBookingPageLocked = shouldLockDisableProps("lockTimeZoneToggleOnBookingPage");
  const multiplePrivateLinksLocked = shouldLockDisableProps("multiplePrivateLinks");
  const reschedulingPastBookingsLocked = shouldLockDisableProps("allowReschedulingPastBookings");
  const hideOrganizerEmailLocked = shouldLockDisableProps("hideOrganizerEmail");
  const customReplyToEmailLocked = shouldLockDisableProps("customReplyToEmail");

  const disableCancellingLocked = shouldLockDisableProps("disableCancelling");
  const disableReschedulingLocked = shouldLockDisableProps("disableRescheduling");
  const allowReschedulingCancelledBookingsLocked = shouldLockDisableProps(
    "allowReschedulingCancelledBookings"
  );

  const { isLocked: _isLocked, ...eventNameLocked } = shouldLockDisableProps("eventName");

  if (isManagedEventType) {
    multiplePrivateLinksLocked.disabled = true;
  }

  const [disableCancelling, setDisableCancelling] = useState(eventType.disableCancelling || false);

  const [disableRescheduling, setDisableRescheduling] = useState(eventType.disableRescheduling || false);

  const [allowReschedulingCancelledBookings, setallowReschedulingCancelledBookings] = useState(
    eventType.allowReschedulingCancelledBookings ?? false
  );

  const showOptimizedSlotsLocked = shouldLockDisableProps("showOptimizedSlots");

  const closeEventNameTip = () => setShowEventNameTip(false);

  const [isEventTypeColorChecked, setIsEventTypeColorChecked] = useState(!!eventType.eventTypeColor);

  const customReplyToEmail = formMethods.watch("customReplyToEmail");

  const [eventTypeColorState, setEventTypeColorState] = useState(
    eventType.eventTypeColor || {
      lightEventTypeColor: DEFAULT_LIGHT_BRAND_COLOR,
      darkEventTypeColor: DEFAULT_DARK_BRAND_COLOR,
    }
  );

  const userTimeZone = extractHostTimezone({
    userId: eventType.userId,
    teamId: eventType.teamId,
    hosts: eventType.hosts,
    owner: eventType.owner,
    team: eventType.team,
  });

  let verifiedSecondaryEmails = [
    {
      label: user?.email || "",
      value: -1,
    },
    ...(user?.secondaryEmails || [])
      .filter((secondaryEmail) => !!secondaryEmail.emailVerified)
      .map((secondaryEmail) => ({ label: secondaryEmail.email, value: secondaryEmail.id })),
  ];

  const removePlatformClientIdFromEmail = (email: string, clientId: string) =>
    email.replace(`+${clientId}`, "");

  let userEmail = user?.email || "";

  if (isPlatform && platformContext.clientId) {
    verifiedSecondaryEmails = verifiedSecondaryEmails.map((email) => ({
      ...email,
      label: removePlatformClientIdFromEmail(email.label, platformContext.clientId),
    }));
    userEmail = removePlatformClientIdFromEmail(userEmail, platformContext.clientId);
  }

  const metadata = formMethods.watch("metadata");
  const paymentAppData = useMemo(() => {
    const _eventType = {
      price: 0,
      currency: "",
      metadata,
    };
    return getPaymentAppData(_eventType);
  }, [metadata]);

  const isPaidEvent = useMemo(
    () => !Number.isNaN(paymentAppData.price) && paymentAppData.price > 0,
    [paymentAppData]
  );

  const TimezoneSelect = useMemo(() => {
    return isPlatform ? PlatformTimzoneSelect : WebTimezoneSelect;
  }, [isPlatform]);

  return (
    <div className="flex flex-col space-y-4">
      <calendarComponents.CalendarSettings
        verifiedSecondaryEmails={verifiedSecondaryEmails}
        userEmail={userEmail}
        calendarsQuery={calendarsQuery}
        isTeamEventType={!!team}
        isChildrenManagedEventType={isChildrenManagedEventType}
        customClassNames={customClassNames}
        eventNameLocked={eventNameLocked}
        eventNamePlaceholder={eventNamePlaceholder}
        setShowEventNameTip={setShowEventNameTip}
        showToast={showToast}
        eventType={eventType}
      />
      {showBookerLayoutSelector && (
        <BookerLayoutSelector
          fallbackToUserSettings
          isDark={selectedThemeIsDark}
          isOuterBorder={true}
          user={user}
          isUserLoading={isUserLoading}
        />
      )}

      <div className="border-subtle bg-muted rounded-lg border p-1">
        <div className="p-5">
          <div className="text-default text-sm font-semibold leading-none ltr:mr-1 rtl:ml-1">
            {t("booking_questions_title")}
          </div>
          <p className="text-subtle mt-1 max-w-[280px] break-words text-sm sm:max-w-[500px]">
            <LearnMoreLink
              t={t}
              i18nKey="booking_questions_description"
              href="https://cal.com/help/event-types/booking-questions"
            />
          </p>
        </div>
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
                  // FormBuilder doesn't handle plural for non-english languages. So, use english(Location) only. This is similar to 'Workflow'
                  source: { label: "Location" },
                  value: getLocationsOptionsForSelect(formMethods.getValues("locations") ?? [], t),
                },
              },
            }}
            shouldConsiderRequired={(field: BookingField) => {
              // Location field has a default value at backend so API can send no location but we don't allow it in UI and thus we want to show it as required to user
              return field.name === "location" ? true : field.required;
            }}
            showPriceField={isPaidEvent}
            paymentCurrency={paymentAppData?.currency || "usd"}
          />
        </div>
      </div>
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        requiresConfirmationWillBlockSlot={formMethods.getValues("requiresConfirmationWillBlockSlot")}
        onRequiresConfirmation={setRequiresConfirmation}
        customClassNames={customClassNames?.requiresConfirmation}
      />

      {!isPlatform && (
        <>
          <Controller
            name="disableCancelling"
            render={({ field: { onChange } }) => (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_cancelling")}
                data-testid="disable-cancelling-toggle"
                {...disableCancellingLocked}
                description={
                  <LearnMoreLink
                    t={t}
                    i18nKey="description_disable_cancelling"
                    href="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-cancelling"
                  />
                }
                checked={disableCancelling}
                onCheckedChange={(val) => {
                  setDisableCancelling(val);
                  onChange(val);
                }}
              />
            )}
          />

          <Controller
            name="disableRescheduling"
            render={({ field: { onChange } }) => (
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_rescheduling")}
                data-testid="disable-rescheduling-toggle"
                {...disableReschedulingLocked}
                description={
                  <LearnMoreLink
                    t={t}
                    i18nKey="description_disable_rescheduling"
                    href="https://cal.com/help/event-types/disable-canceling-rescheduling#disable-rescheduling"
                  />
                }
                checked={disableRescheduling}
                onCheckedChange={(val) => {
                  setDisableRescheduling(val);
                  onChange(val);
                }}
              />
            )}
          />
        </>
      )}

      <Controller
        name="canSendCalVideoTranscriptionEmails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames(
              "text-sm",
              customClassNames?.canSendCalVideoTranscriptionEmails?.label
            )}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.canSendCalVideoTranscriptionEmails?.container
            )}
            title={t("send_cal_video_transcription_emails")}
            data-testid="send-cal-video-transcription-emails"
            {...sendCalVideoTranscriptionEmailsProps}
            description={t("description_send_cal_video_transcription_emails")}
            descriptionClassName={customClassNames?.canSendCalVideoTranscriptionEmails?.description}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      {!isPlatform && (
        <Controller
          name="autoTranslateDescriptionEnabled"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              labelClassName="text-sm"
              title={t("translate_description_button")}
              checked={value}
              onCheckedChange={(e) => onChange(e)}
              disabled={!orgId}
              tooltip={!orgId ? t("orgs_upgrade_to_enable_feature") : undefined}
              data-testid="ai_translation_toggle"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
              description={t("translate_description_button_description")}
            />
          )}
        />
      )}
      {!isPlatform && (
        <Controller
          name="interfaceLanguage"
          control={formMethods.control}
          defaultValue={eventType.interfaceLanguage ?? null}
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                interfaceLanguageVisible && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              data-testid="event-interface-language-toggle"
              title={t("interface_language")}
              description={t("interface_language_description")}
              checked={interfaceLanguageVisible}
              {...shouldLockIndicator("interfaceLanguage")}
              onCheckedChange={(e) => {
                setInterfaceLanguageVisible(e);
                if (!e) {
                  // disables the setting
                  formMethods.setValue("interfaceLanguage", null, { shouldDirty: true });
                } else {
                  // "" is default value which means visitors browser language
                  formMethods.setValue("interfaceLanguage", "", { shouldDirty: true });
                }
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <Select<{ label: string; value: string }>
                  data-testid="event-interface-language"
                  className="capitalize"
                  options={interfaceLanguageOptions}
                  onChange={(option) => {
                    onChange(option?.value);
                  }}
                  value={interfaceLanguageOptions.find((option) => option.value === value) || undefined}
                />
              </div>
            </SettingsToggle>
          )}
        />
      )}
      <Controller
        name="requiresBookerEmailVerification"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.bookerEmailVerification?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.bookerEmailVerification?.container
            )}
            title={t("requires_booker_email_verification")}
            data-testid="requires-booker-email-verification"
            {...requiresBookerEmailVerificationProps}
            description={t("description_requires_booker_email_verification")}
            descriptionClassName={customClassNames?.bookerEmailVerification?.description}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <Controller
        name="hideCalendarNotes"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.calendarNotes?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.calendarNotes?.container
            )}
            descriptionClassName={customClassNames?.calendarNotes?.description}
            data-testid="disable-notes"
            title={t("disable_notes")}
            {...hideCalendarNotesLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="disable_notes_description"
                href="https://cal.com/help/event-types/hide-notes"
              />
            }
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <Controller
        name="hideCalendarEventDetails"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.eventDetailsVisibility?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.eventDetailsVisibility?.container
            )}
            descriptionClassName={customClassNames?.eventDetailsVisibility?.description}
            title={t("hide_calendar_event_details")}
            {...hideCalendarEventDetailsLocked}
            description={t("description_hide_calendar_event_details")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <Controller
        name="successRedirectUrl"
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.bookingRedirect?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                redirectUrlVisible && "rounded-b-none",
                customClassNames?.bookingRedirect?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.bookingRedirect?.children)}
              descriptionClassName={customClassNames?.bookingRedirect?.description}
              title={t("redirect_success_booking")}
              data-testid="redirect-success-booking"
              {...successRedirectUrlLocked}
              description={t("redirect_url_description")}
              checked={redirectUrlVisible}
              onCheckedChange={(e) => {
                setRedirectUrlVisible(e);
                onChange(e ? value : "");
              }}>
              <div
                className={classNames(
                  "border-subtle rounded-b-lg border border-t-0 p-6",
                  customClassNames?.bookingRedirect?.redirectUrlInput?.container
                )}>
                <TextField
                  className={classNames("w-full", customClassNames?.bookingRedirect?.redirectUrlInput?.input)}
                  label={t("redirect_success_booking")}
                  labelClassName={customClassNames?.bookingRedirect?.redirectUrlInput?.label}
                  labelSrOnly
                  disabled={successRedirectUrlLocked.disabled}
                  placeholder={t("external_redirect_url")}
                  data-testid="external-redirect-url"
                  required={redirectUrlVisible}
                  type="text"
                  {...formMethods.register("successRedirectUrl")}
                />

                <div
                  className={classNames(
                    "mt-4",
                    customClassNames?.bookingRedirect?.forwardParamsCheckbox?.container
                  )}>
                  <Controller
                    name="forwardParamsSuccessRedirect"
                    render={({ field: { value, onChange } }) => (
                      <CheckboxField
                        description={t("forward_params_redirect")}
                        disabled={successRedirectUrlLocked.disabled}
                        className={customClassNames?.bookingRedirect?.forwardParamsCheckbox?.checkbox}
                        descriptionClassName={
                          customClassNames?.bookingRedirect?.forwardParamsCheckbox?.description
                        }
                        onChange={(e) => onChange(e)}
                        checked={value}
                      />
                    )}
                  />
                </div>
                <div
                  className={classNames(
                    "p-1 text-sm text-orange-600",
                    formMethods.getValues("successRedirectUrl") ? "block" : "hidden",
                    customClassNames?.bookingRedirect?.error
                  )}
                  data-testid="redirect-url-warning">
                  {t("redirect_url_warning")}
                </div>
              </div>
            </SettingsToggle>
          </>
        )}
      />
      {!isPlatform && (
        <Controller
          name="multiplePrivateLinks"
          render={() => {
            return (
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
                {...multiplePrivateLinksLocked}
                description={
                  <LearnMoreLink
                    t={t}
                    i18nKey="multiple_private_links_description"
                    href="https://cal.com/help/event-types/private-links"
                  />
                }
                tooltip={isManagedEventType ? t("managed_event_field_parent_control_disabled") : ""}
                checked={multiplePrivateLinksVisible}
                onCheckedChange={(e) => {
                  if (!e) {
                    formMethods.setValue("multiplePrivateLinks", [], { shouldDirty: true });
                  } else {
                    formMethods.setValue(
                      "multiplePrivateLinks",
                      [generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id)],
                      { shouldDirty: true }
                    );
                  }
                  setMultiplePrivateLinksVisible(e);
                }}>
                {!isManagedEventType && (
                  <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                    <MultiplePrivateLinksController
                      team={team}
                      bookerUrl={eventType.bookerUrl}
                      setMultiplePrivateLinksVisible={setMultiplePrivateLinksVisible}
                      userTimeZone={userTimeZone}
                    />
                  </div>
                )}
              </SettingsToggle>
            );
          }}
        />
      )}
      <Controller
        name="seatsPerTimeSlotEnabled"
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.seatsOptions?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                value && "rounded-b-none",
                customClassNames?.seatsOptions?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.seatsOptions?.children)}
              descriptionClassName={customClassNames?.seatsOptions?.description}
              data-testid="offer-seats-toggle"
              title={t("offer_seats")}
              {...seatsLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="offer_seats_description"
                  href="https://cal.com/help/event-types/offer-seats"
                />
              }
              checked={value}
              disabled={noShowFeeEnabled || multiLocation || (!seatsEnabled && isRecurringEvent)}
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
                // Enabling seats will disable guests and requiring confirmation until fully supported
                if (e) {
                  toggleGuests(false);
                  formMethods.setValue("requiresConfirmation", false, { shouldDirty: true });
                  setRequiresConfirmation(false);
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
                  render={({ field: { value, onChange } }) => (
                    <div>
                      <TextField
                        required
                        name="seatsPerTimeSlot"
                        labelSrOnly
                        label={t("number_of_seats")}
                        type="number"
                        disabled={seatsLocked.disabled}
                        //For old events if value > MAX_SEATS_PER_TIME_SLOT
                        value={value > MAX_SEATS_PER_TIME_SLOT ? MAX_SEATS_PER_TIME_SLOT : value ?? 1}
                        step={1}
                        placeholder="1"
                        min={1}
                        max={MAX_SEATS_PER_TIME_SLOT}
                        containerClassName={classNames(
                          "max-w-80",
                          customClassNames?.seatsOptions?.seatsInput.container
                        )}
                        addOnClassname={customClassNames?.seatsOptions?.seatsInput.addOn}
                        className={customClassNames?.seatsOptions?.seatsInput?.input}
                        labelClassName={customClassNames?.seatsOptions?.seatsInput?.label}
                        addOnSuffix={t("seats")}
                        onChange={(e) => {
                          const enteredValue = parseInt(e.target.value);
                          onChange(Math.min(enteredValue, MAX_SEATS_PER_TIME_SLOT));
                        }}
                        data-testid="seats-per-time-slot"
                      />
                      <div
                        className={classNames(
                          "mt-4",
                          customClassNames?.seatsOptions?.showAttendeesCheckbox?.container
                        )}>
                        <Controller
                          name="seatsShowAttendees"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              data-testid="show-attendees"
                              description={t("show_attendees")}
                              className={customClassNames?.seatsOptions?.showAttendeesCheckbox?.checkbox}
                              descriptionClassName={
                                customClassNames?.seatsOptions?.showAttendeesCheckbox?.description
                              }
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
                            />
                          )}
                        />
                      </div>
                      <div
                        className={classNames(
                          "mt-2",
                          customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.container
                        )}>
                        <Controller
                          name="seatsShowAvailabilityCount"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              description={t("show_available_seats_count")}
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
                              className={
                                customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.checkbox
                              }
                              descriptionClassName={
                                customClassNames?.seatsOptions?.showAvalableSeatCountCheckbox?.description
                              }
                            />
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
      <Controller
        name="hideOrganizerEmail"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.hideOrganizerEmail?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.hideOrganizerEmail?.container
            )}
            title={t("hide_organizer_email")}
            {...hideOrganizerEmailLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="hide_organizer_email_description"
                href="https://cal.com/help/event-types/hideorganizersemail#hide-organizers-email"
              />
            }
            descriptionClassName={customClassNames?.hideOrganizerEmail?.description}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            data-testid="hide-organizer-email"
          />
        )}
      />
      <Controller
        name="lockTimeZoneToggleOnBookingPage"
        render={({ field: { value, onChange } }) => {
          // Calculate if we should show the selector based on current form state & handle backward compatibility
          const currentLockedTimeZone = formMethods.getValues("lockedTimeZone");
          const showSelector =
            value &&
            (!(eventType.lockTimeZoneToggleOnBookingPage && !eventType.lockedTimeZone) ||
              !!currentLockedTimeZone);

          return (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.timezoneLock?.label)}
              descriptionClassName={customClassNames?.timezoneLock?.description}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                customClassNames?.timezoneLock?.container,
                showSelector && "rounded-b-none"
              )}
              title={t("lock_timezone_toggle_on_booking_page")}
              {...lockTimeZoneToggleOnBookingPageLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="description_lock_timezone_toggle_on_booking_page"
                  href="https://cal.com/help/event-types/timezone-lock"
                />
              }
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
                      render={({ field: { value } }) => (
                        <>
                          <Label className="text-default mb-2 block text-sm font-medium">
                            <>{t("timezone")}</>
                          </Label>
                          <TimezoneSelect
                            id="lockedTimeZone"
                            value={value ?? "Europe/London"}
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
      <Controller
        name="allowReschedulingPastBookings"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm")}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames("border-subtle rounded-lg border py-6 px-4 sm:px-6")}
            title={t("allow_rescheduling_past_events")}
            {...reschedulingPastBookingsLocked}
            description={
              <LearnMoreLink
                t={t}
                i18nKey="allow_rescheduling_past_events_description"
                href="https://cal.com/help/event-types/allow-rescheduling"
              />
            }
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />

      <Controller
        name="allowReschedulingCancelledBookings"
        render={({ field: { onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("allow_rescheduling_cancelled_bookings")}
            data-testid="allow-rescheduling-cancelled-bookings-toggle"
            {...allowReschedulingCancelledBookingsLocked}
            description={t("description_allow_rescheduling_cancelled_bookings")}
            checked={allowReschedulingCancelledBookings}
            onCheckedChange={(val) => {
              setallowReschedulingCancelledBookings(val);
              onChange(val);
            }}
          />
        )}
      />
      <>
        <Controller
          name="customReplyToEmail"
          render={({ field: { value, onChange } }) => (
            <>
              <SettingsToggle
                labelClassName={classNames("text-sm", customClassNames?.customReplyToEmail?.label)}
                toggleSwitchAtTheEnd={true}
                switchContainerClassName={classNames(
                  "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                  !!value && "rounded-b-none",
                  customClassNames?.customReplyToEmail?.container
                )}
                descriptionClassName={customClassNames?.customReplyToEmail?.description}
                childrenClassName={classNames("lg:ml-0", customClassNames?.customReplyToEmail?.children)}
                title={t("custom_reply_to_email_title")}
                {...customReplyToEmailLocked}
                data-testid="custom-reply-to-email"
                description={t("custom_reply_to_email_description")}
                checked={!!customReplyToEmail}
                onCheckedChange={(e) => {
                  onChange(
                    e
                      ? customReplyToEmail || eventType.customReplyToEmail || verifiedEmails?.[0] || null
                      : null
                  );
                }}>
                {isPlatform && (
                  <AddVerifiedEmail username={eventType.users[0]?.name || "there"} showToast={showToast} />
                )}
                <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                  <SelectField
                    className="w-full"
                    label={t("custom_reply_to_email_title")}
                    required={!!customReplyToEmail}
                    placeholder={t("select_verified_email")}
                    data-testid="custom-reply-to-email-input"
                    value={value ? { label: value, value } : undefined}
                    onChange={(option) => onChange(option?.value || null)}
                    options={verifiedEmails?.map((email) => ({ label: email, value: email })) || []}
                  />
                </div>
              </SettingsToggle>
            </>
          )}
        />
      </>
      <Controller
        name="eventTypeColor"
        render={() => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.eventTypeColors?.label)}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              isEventTypeColorChecked && "rounded-b-none",
              customClassNames?.eventTypeColors?.container
            )}
            title={t("event_type_color")}
            {...eventTypeColorLocked}
            description={t("event_type_color_description")}
            descriptionClassName={customClassNames?.eventTypeColors?.description}
            checked={isEventTypeColorChecked}
            onCheckedChange={(e) => {
              const value = e ? eventTypeColorState : null;
              formMethods.setValue("eventTypeColor", value, {
                shouldDirty: true,
              });
              setIsEventTypeColorChecked(e);
            }}
            childrenClassName={classNames("lg:ml-0", customClassNames?.eventTypeColors?.children)}>
            <div className="border-subtle flex flex-col gap-6 rounded-b-lg border border-t-0 p-6">
              <div>
                <p className="text-default mb-2 block text-sm font-medium">{t("light_event_type_color")}</p>
                <ColorPicker
                  defaultValue={eventTypeColorState.lightEventTypeColor}
                  onChange={(value) => {
                    const newVal = {
                      ...eventTypeColorState,
                      lightEventTypeColor: value,
                    };
                    formMethods.setValue("eventTypeColor", newVal, { shouldDirty: true });
                    setEventTypeColorState(newVal);
                    if (checkWCAGContrastColor("#ffffff", value)) {
                      setLightModeError(false);
                    } else {
                      setLightModeError(true);
                    }
                  }}
                />
                {lightModeError ? (
                  <div className="mt-4">
                    <Alert
                      severity="warning"
                      className={customClassNames?.eventTypeColors?.warningText}
                      message={t("event_type_color_light_theme_contrast_error")}
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-6 sm:mt-0">
                <p className="text-default mb-2 block text-sm font-medium">{t("dark_event_type_color")}</p>
                <ColorPicker
                  defaultValue={eventTypeColorState.darkEventTypeColor}
                  onChange={(value) => {
                    const newVal = {
                      ...eventTypeColorState,
                      darkEventTypeColor: value,
                    };
                    formMethods.setValue("eventTypeColor", newVal, { shouldDirty: true });
                    setEventTypeColorState(newVal);
                    if (checkWCAGContrastColor("#101010", value)) {
                      setDarkModeError(false);
                    } else {
                      setDarkModeError(true);
                    }
                  }}
                />
                {darkModeError ? (
                  <div className="mt-4">
                    <Alert
                      severity="warning"
                      className={customClassNames?.eventTypeColors?.warningText}
                      message={t("event_type_color_dark_theme_contrast_error")}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </SettingsToggle>
        )}
      />
      <Controller
        name="showOptimizedSlots"
        render={({ field: { onChange, value } }) => {
          const isChecked = value;
          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName="text-sm"
              title={t("show_optimized_slots")}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="show_optimized_slots_description"
                  href="https://cal.com/help/event-types/optimized-slots#optimized-slots"
                />
              }
              checked={isChecked}
              {...showOptimizedSlotsLocked}
              onCheckedChange={(active) => {
                onChange(active ?? false);
              }}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none"
              )}
            />
          );
        }}
      />
      {isRoundRobinEventType && (
        <Controller
          name="rescheduleWithSameRoundRobinHost"
          render={({ field: { value, onChange } }) => (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.roundRobinReschedule?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                customClassNames?.roundRobinReschedule?.container
              )}
              title={t("reschedule_with_same_round_robin_host_title")}
              description={t("reschedule_with_same_round_robin_host_description")}
              descriptionClassName={customClassNames?.roundRobinReschedule?.description}
              checked={value}
              onCheckedChange={(e) => onChange(e)}
            />
          )}
        />
      )}
      {allowDisablingAttendeeConfirmationEmails(workflows) && (
        <Controller
          name="metadata.disableStandardEmails.confirmation.attendee"
          render={({ field: { value, onChange } }) => (
            <>
              <SettingsToggle
                labelClassName={classNames("text-sm", customClassNames?.emailNotifications?.label)}
                toggleSwitchAtTheEnd={true}
                switchContainerClassName={classNames(
                  "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                  customClassNames?.emailNotifications?.container
                )}
                title={t("disable_attendees_confirmation_emails")}
                description={t("disable_attendees_confirmation_emails_description")}
                descriptionClassName={customClassNames?.emailNotifications?.description}
                checked={value}
                onCheckedChange={(e) => onChange(e)}
              />
            </>
          )}
        />
      )}
      {allowDisablingHostConfirmationEmails(workflows) && (
        <Controller
          name="metadata.disableStandardEmails.confirmation.host"
          defaultValue={!!formMethods.getValues("seatsPerTimeSlot")}
          render={({ field: { value, onChange } }) => (
            <>
              <SettingsToggle
                labelClassName={classNames("text-sm", customClassNames?.emailNotifications?.label)}
                toggleSwitchAtTheEnd={true}
                switchContainerClassName={classNames(
                  "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                  customClassNames?.emailNotifications?.container
                )}
                descriptionClassName={customClassNames?.emailNotifications?.description}
                title={t("disable_host_confirmation_emails")}
                description={t("disable_host_confirmation_emails_description")}
                checked={value}
                onCheckedChange={(e) => onChange(e)}
              />
            </>
          )}
        />
      )}

      {team?.parentId && (
        <>
          <Controller
            name="metadata.disableStandardEmails.all.attendee"
            render={({ field: { value, onChange } }) => {
              return (
                <>
                  <DisableAllEmailsSetting
                    checked={value}
                    onCheckedChange={onChange}
                    recipient="attendees"
                    customClassNames={customClassNames?.emailNotifications}
                    t={t}
                  />
                </>
              );
            }}
          />
          <Controller
            name="metadata.disableStandardEmails.all.host"
            defaultValue={!!formMethods.getValues("seatsPerTimeSlot")}
            render={({ field: { value, onChange } }) => (
              <>
                <DisableAllEmailsSetting
                  checked={value}
                  onCheckedChange={onChange}
                  recipient="hosts"
                  customClassNames={customClassNames?.emailNotifications}
                  t={t}
                />
              </>
            )}
          />
        </>
      )}
      {showEventNameTip && (
        <CustomEventTypeModal
          close={closeEventNameTip}
          setValue={(val: string) => formMethods.setValue("eventName", val, { shouldDirty: true })}
          defaultValue={formMethods.getValues("eventName")}
          placeHolder={eventNamePlaceholder}
          isNameFieldSplit={isSplit}
          event={eventNameObject}
          customClassNames={customClassNames?.customEventTypeModal}
        />
      )}
    </div>
  );
};
