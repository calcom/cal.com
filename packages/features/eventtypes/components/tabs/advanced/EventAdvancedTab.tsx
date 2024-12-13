import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { z } from "zod";

import { useAtomsContext, useIsPlatform } from "@calcom/atoms/monorepo";
import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { MultiplePrivateLinksController } from "@calcom/features/eventtypes/components";
import type {
  FormValues,
  EventTypeSetupProps,
  SelectClassNames,
  CheckboxClassNames,
  InputClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import type { fieldSchema } from "@calcom/features/form-builder/schema";
import type { EditableSchema } from "@calcom/features/form-builder/schema";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import { classNames } from "@calcom/lib";
import cx from "@calcom/lib/classNames";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR, APP_NAME } from "@calcom/lib/constants";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  Badge,
  CheckboxField,
  Icon,
  Label,
  SelectField,
  SettingsToggle,
  Switch,
  TextField,
  ColorPicker,
} from "@calcom/ui";

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
  eventTypeColors?: SettingsToggleClassNames & {
    warningText?: string;
  };
  roundRobinReschedule?: SettingsToggleClassNames;
  emailNotifications?: EmailNotificationToggleCustomClassNames;
};

type BookingField = z.infer<typeof fieldSchema>;

export type EventAdvancedBaseProps = Pick<EventTypeSetupProps, "eventType" | "team"> & {
  user?: Partial<
    Pick<RouterOutputs["viewer"]["me"], "email" | "secondaryEmails" | "theme" | "defaultBookerLayouts">
  >;
  isUserLoading?: boolean;
  showToast: (message: string, variant: "success" | "warning" | "error") => void;
  customClassNames?: EventAdvancedTabCustomClassNames;
};

export type EventAdvancedTabProps = EventAdvancedBaseProps & {
  calendarsQueryData?: RouterOutputs["viewer"]["connectedCalendars"];
  showBookerLayoutSelector: boolean;
};

export const EventAdvancedTab = ({
  eventType,
  team,
  calendarsQueryData,
  user,
  isUserLoading,
  showToast,
  showBookerLayoutSelector,
  customClassNames,
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
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));
  const [useEventTypeDestinationCalendarEmail, setUseEventTypeDestinationCalendarEmail] = useState(
    formMethods.getValues("useEventTypeDestinationCalendarEmail")
  );

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

  const { isChildrenManagedEventType, isManagedEventType, shouldLockDisableProps } = useLockedFieldsManager({
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
  const hideCalendarNotesLocked = shouldLockDisableProps("hideCalendarNotes");
  const hideCalendarEventDetailsLocked = shouldLockDisableProps("hideCalendarEventDetails");
  const eventTypeColorLocked = shouldLockDisableProps("eventTypeColor");
  const lockTimeZoneToggleOnBookingPageLocked = shouldLockDisableProps("lockTimeZoneToggleOnBookingPage");
  const multiplePrivateLinksLocked = shouldLockDisableProps("multiplePrivateLinks");
  const { isLocked, ...eventNameLocked } = shouldLockDisableProps("eventName");

  if (isManagedEventType) {
    multiplePrivateLinksLocked.disabled = true;
  }

  const closeEventNameTip = () => setShowEventNameTip(false);

  const [isEventTypeColorChecked, setIsEventTypeColorChecked] = useState(!!eventType.eventTypeColor);

  const [eventTypeColorState, setEventTypeColorState] = useState(
    eventType.eventTypeColor || {
      lightEventTypeColor: DEFAULT_LIGHT_BRAND_COLOR,
      darkEventTypeColor: DEFAULT_DARK_BRAND_COLOR,
    }
  );

  const displayDestinationCalendarSelector =
    !!calendarsQueryData?.connectedCalendars?.length && (!team || isChildrenManagedEventType);

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

  const selectedSecondaryEmailId = formMethods.getValues("secondaryEmailId") || -1;
  return (
    <div className="flex flex-col space-y-4">
      {/**
       * Only display calendar selector if user has connected calendars AND if it's not
       * a team event. Since we don't have logic to handle each attendee calendar (for now).
       * This will fallback to each user selected destination calendar.
       */}
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          {displayDestinationCalendarSelector && (
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
                    calendarsQueryData={calendarsQueryData}
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
          {displayDestinationCalendarSelector && (
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
                  formMethods.setValue("useEventTypeDestinationCalendarEmail", val, { shouldDirty: true });
                  if (val) {
                    showToast(t("reconnect_calendar_to_use"), "warning");
                  }
                }}
              />
            </div>
          )}
          {!useEventTypeDestinationCalendarEmail && verifiedSecondaryEmails.length > 0 && !team && (
            <div className={cx("flex w-full flex-col", displayDestinationCalendarSelector && "pl-11")}>
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
      {showBookerLayoutSelector && (
        <BookerLayoutSelector
          fallbackToUserSettings
          isDark={selectedThemeIsDark}
          isOuterBorder={true}
          user={user}
          isUserLoading={isUserLoading}
        />
      )}
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <FormBuilder
          title={t("booking_questions_title")}
          description={t("booking_questions_description")}
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
        />
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
            description={t("disable_notes_description")}
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
                description={t("multiple_private_links_description", { appName: APP_NAME })}
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
                    <MultiplePrivateLinksController team={team} bookerUrl={eventType.bookerUrl} />
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
              description={t("offer_seats_description")}
              checked={value}
              disabled={noShowFeeEnabled || multiLocation}
              tooltip={
                multiLocation
                  ? t("multilocation_doesnt_support_seats")
                  : noShowFeeEnabled
                  ? t("no_show_fee_doesnt_support_seats")
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
                        defaultValue={value}
                        min={1}
                        containerClassName={classNames(
                          "max-w-80",
                          customClassNames?.seatsOptions?.seatsInput.container
                        )}
                        addOnClassname={customClassNames?.seatsOptions?.seatsInput.addOn}
                        className={customClassNames?.seatsOptions?.seatsInput?.input}
                        labelClassName={customClassNames?.seatsOptions?.seatsInput?.label}
                        addOnSuffix={<>{t("seats")}</>}
                        onChange={(e) => {
                          onChange(Math.abs(Number(e.target.value)));
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
        name="lockTimeZoneToggleOnBookingPage"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName={classNames("text-sm", customClassNames?.timezoneLock?.label)}
            descriptionClassName={customClassNames?.timezoneLock?.description}
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle rounded-lg border py-6 px-4 sm:px-6",
              customClassNames?.timezoneLock?.container
            )}
            title={t("lock_timezone_toggle_on_booking_page")}
            {...lockTimeZoneToggleOnBookingPageLocked}
            description={t("description_lock_timezone_toggle_on_booking_page")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            data-testid="lock-timezone-toggle"
          />
        )}
      />
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
