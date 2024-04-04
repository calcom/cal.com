import dynamic from "next/dynamic";
import type { EventTypeSetupProps } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { z } from "zod";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import type { EditableSchema } from "@calcom/features/form-builder/schema";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import { classNames } from "@calcom/lib";
import cx from "@calcom/lib/classNames";
import { APP_NAME, IS_VISUAL_REGRESSION_TESTING, WEBSITE_URL } from "@calcom/lib/constants";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
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
  Tooltip,
  showToast,
} from "@calcom/ui";

import RequiresConfirmationController from "./RequiresConfirmationController";

const CustomEventTypeModal = dynamic(() => import("@components/eventtype/CustomEventTypeModal"));

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupProps, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  const { data: user } = trpc.viewer.me.useQuery();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!formMethods.getValues("hashedLink"));
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!formMethods.getValues("successRedirectUrl"));
  const [useEventTypeDestinationCalendarEmail, setUseEventTypeDestinationCalendarEmail] = useState(
    formMethods.getValues("useEventTypeDestinationCalendarEmail")
  );
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const bookingFields: Prisma.JsonObject = {};

  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);
  const selectedThemeIsDark =
    user?.theme === "dark" ||
    (!user?.theme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  formMethods.getValues().bookingFields.forEach(({ name }) => {
    bookingFields[name] = `${name} input`;
  });

  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: formMethods.getValues("title"),
    eventName: formMethods.getValues("eventName"),
    host: formMethods.getValues("users")[0]?.name || "Nameless",
    bookingFields: bookingFields,
    t,
  };

  const [requiresConfirmation, setRequiresConfirmation] = useState(
    formMethods.getValues("requiresConfirmation")
  );
  const placeholderHashedLink = `${WEBSITE_URL}/d/${hashedUrl}/${formMethods.getValues("slug")}`;
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(formMethods.getValues("users")[0]?.id ?? team?.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formMethods.getValues("users"), hashedUrl, team?.id]);

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
  const lockTimeZoneToggleOnBookingPageLocked = shouldLockDisableProps("lockTimeZoneToggleOnBookingPage");

  const closeEventNameTip = () => setShowEventNameTip(false);
  const displayDestinationCalendarSelector =
    !!connectedCalendarsQuery.data?.connectedCalendars.length && (!team || isChildrenManagedEventType);

  const verifiedSecondaryEmails = [
    {
      label: user?.email || "",
      value: -1,
    },
    ...(user?.secondaryEmails || [])
      .filter((secondaryEmail) => !!secondaryEmail.emailVerified)
      .map((secondaryEmail) => ({ label: secondaryEmail.email, value: secondaryEmail.id })),
  ];
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
            <div className="flex w-full flex-col">
              <Label className="text-emphasis mb-0 font-medium">{t("add_to_calendar")}</Label>
              <Controller
                name="destinationCalendar"
                render={({ field: { onChange, value } }) => (
                  <DestinationCalendarSelector
                    value={value ? value.externalId : undefined}
                    onChange={onChange}
                    hidePlaceholder
                    hideAdvancedText
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
              {...shouldLockDisableProps("eventName")}
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
                      <Badge variant="blue">{t("default")}</Badge> {user?.email || ""}
                    </span>
                  )
                }
                onChange={(option) =>
                  formMethods.setValue("secondaryEmailId", option?.value, { shouldDirty: true })
                }
                value={verifiedSecondaryEmails.find(
                  (secondaryEmail) =>
                    selectedSecondaryEmailId !== -1 && secondaryEmail.value === selectedSecondaryEmailId
                )}
                options={verifiedSecondaryEmails}
              />
              <p className="text-subtle mt-2 text-sm">{t("display_email_as_organizer")}</p>
            </div>
          )}
        </div>
      </div>
      <BookerLayoutSelector fallbackToUserSettings isDark={selectedThemeIsDark} isOuterBorder={true} />
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <FormBuilder
          title={t("booking_questions_title")}
          description={t("booking_questions_description")}
          addFieldLabel={t("add_a_booking_question")}
          formProp="bookingFields"
          {...shouldLockDisableProps("bookingFields")}
          dataStore={{
            options: {
              locations: getLocationsOptionsForSelect(formMethods.getValues("locations") ?? [], t),
            },
          }}
        />
      </div>
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={formMethods.getValues("metadata")}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmation={setRequiresConfirmation}
      />
      <Controller
        name="requiresBookerEmailVerification"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("requires_booker_email_verification")}
            data-testid="requires-booker-email-verification"
            {...requiresBookerEmailVerificationProps}
            description={t("description_requires_booker_email_verification")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <Controller
        name="hideCalendarNotes"
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
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
        name="successRedirectUrl"
        render={({ field: { value, onChange } }) => (
          <>
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
              {...successRedirectUrlLocked}
              description={t("redirect_url_description")}
              checked={redirectUrlVisible}
              onCheckedChange={(e) => {
                setRedirectUrlVisible(e);
                onChange(e ? value : "");
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <TextField
                  className="w-full"
                  label={t("redirect_success_booking")}
                  labelSrOnly
                  disabled={successRedirectUrlLocked.disabled}
                  placeholder={t("external_redirect_url")}
                  data-testid="external-redirect-url"
                  required={redirectUrlVisible}
                  type="text"
                  {...formMethods.register("successRedirectUrl")}
                />

                <div className="mt-4">
                  <Controller
                    name="forwardParamsSuccessRedirect"
                    render={({ field: { value, onChange } }) => (
                      <CheckboxField
                        description={t("forward_params_redirect")}
                        disabled={successRedirectUrlLocked.disabled}
                        onChange={(e) => onChange(e)}
                        checked={value}
                      />
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
          </>
        )}
      />
      <SettingsToggle
        labelClassName="text-sm"
        toggleSwitchAtTheEnd={true}
        switchContainerClassName={classNames(
          "border-subtle rounded-lg border py-6 px-4 sm:px-6",
          hashedLinkVisible && "rounded-b-none"
        )}
        childrenClassName="lg:ml-0"
        data-testid="hashedLinkCheck"
        title={t("enable_private_url")}
        Badge={
          <a
            data-testid="hashedLinkCheck-info"
            target="_blank"
            rel="noreferrer"
            href="https://cal.com/docs/core-features/event-types/single-use-private-links">
            <Icon name="info" className="ml-1.5 h-4 w-4 cursor-pointer" />
          </a>
        }
        {...shouldLockDisableProps("hashedLink")}
        description={t("private_link_description", { appName: APP_NAME })}
        checked={hashedLinkVisible}
        onCheckedChange={(e) => {
          formMethods.setValue("hashedLink", e ? hashedUrl : undefined, { shouldDirty: true });
          setHashedLinkVisible(e);
        }}>
        {!isManagedEventType && (
          <div className="border-subtle rounded-b-lg border border-t-0 p-6">
            {!IS_VISUAL_REGRESSION_TESTING && (
              <TextField
                disabled
                name="hashedLink"
                label={t("private_link_label")}
                data-testid="generated-hash-url"
                labelSrOnly
                type="text"
                hint={t("private_link_hint")}
                defaultValue={placeholderHashedLink}
                addOnSuffix={
                  <Tooltip
                    content={
                      formMethods.getValues("hashedLink") ? t("copy_to_clipboard") : t("enabled_after_update")
                    }>
                    <Button
                      color="minimal"
                      size="sm"
                      type="button"
                      className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
                      aria-label="copy link"
                      onClick={() => {
                        navigator.clipboard.writeText(placeholderHashedLink);
                        if (formMethods.getValues("hashedLink")) {
                          showToast(t("private_link_copied"), "success");
                        } else {
                          showToast(t("enabled_after_update_description"), "warning");
                        }
                      }}>
                      <Icon name="copy" className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                }
              />
            )}
          </div>
        )}
      </SettingsToggle>
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
              {...seatsLocked}
              description={t("offer_seats_description")}
              checked={value}
              disabled={noShowFeeEnabled}
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
                        containerClassName="max-w-80"
                        addOnSuffix={<>{t("seats")}</>}
                        onChange={(e) => {
                          onChange(Math.abs(Number(e.target.value)));
                        }}
                        data-testid="seats-per-time-slot"
                      />
                      <div className="mt-4">
                        <Controller
                          name="seatsShowAttendees"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              data-testid="show-attendees"
                              description={t("show_attendees")}
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
                            />
                          )}
                        />
                      </div>
                      <div className="mt-2">
                        <Controller
                          name="seatsShowAvailabilityCount"
                          render={({ field: { value, onChange } }) => (
                            <CheckboxField
                              description={t("show_available_seats_count")}
                              disabled={seatsLocked.disabled}
                              onChange={(e) => onChange(e)}
                              checked={value}
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
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
            title={t("lock_timezone_toggle_on_booking_page")}
            {...lockTimeZoneToggleOnBookingPageLocked}
            description={t("description_lock_timezone_toggle_on_booking_page")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            data-testid="lock-timezone-toggle"
          />
        )}
      />
      {allowDisablingAttendeeConfirmationEmails(workflows) && (
        <Controller
          name="metadata.disableStandardEmails.confirmation.attendee"
          render={({ field: { value, onChange } }) => (
            <>
              <SettingsToggle
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_attendees_confirmation_emails")}
                description={t("disable_attendees_confirmation_emails_description")}
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
                labelClassName="text-sm"
                toggleSwitchAtTheEnd={true}
                switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
                title={t("disable_host_confirmation_emails")}
                description={t("disable_host_confirmation_emails_description")}
                checked={value}
                onCheckedChange={(e) => onChange(e)}
              />
            </>
          )}
        />
      )}
      {showEventNameTip && (
        <CustomEventTypeModal
          close={closeEventNameTip}
          setValue={(val: string) => formMethods.setValue("eventName", val, { shouldDirty: true })}
          defaultValue={formMethods.getValues("eventName")}
          placeHolder={eventNamePlaceholder}
          event={eventNameObject}
        />
      )}
    </div>
  );
};
