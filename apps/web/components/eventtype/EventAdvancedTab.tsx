import dynamic from "next/dynamic";
import Link from "next/link";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { classNames } from "@calcom/lib";
import { APP_NAME, CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Prisma } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import { Button, Checkbox, Label, SettingsToggle, showToast, TextField, Tooltip, Alert } from "@calcom/ui";
import { Edit, Copy } from "@calcom/ui/components/icon";

import RequiresConfirmationController from "./RequiresConfirmationController";

const CustomEventTypeModal = dynamic(() => import("@components/eventtype/CustomEventTypeModal"));

const generateHashedLink = (id: number) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupProps, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();

  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!eventType.successRedirectUrl);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);

  const bookingFields: Prisma.JsonObject = {};

  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);

  eventType.bookingFields.forEach(({ name }) => {
    bookingFields[name] = name + " input";
  });

  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: eventType.title,
    eventName: eventType.eventName,
    host: eventType.users[0]?.name || "Nameless",
    bookingFields: bookingFields,
    t,
  };

  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);
  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");
  const noShowFeeEnabled = eventType.metadata.apps?.stripe?.paymentOption === "HOLD";

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(eventType.users[0]?.id ?? team?.id));
  }, [eventType.users, hashedUrl, team?.id]);

  const toggleGuests = (enabled: boolean) => {
    const bookingFields = formMethods.getValues("bookingFields");
    formMethods.setValue(
      "bookingFields",
      bookingFields.map((field) => {
        if (field.name === "guests") {
          return {
            ...field,
            hidden: !enabled,
          };
        }
        return field;
      })
    );
  };

  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );
  const eventNamePlaceholder = getEventName({
    ...eventNameObject,
    eventName: formMethods.watch("eventName"),
  });

  const successRedirectUrlLocked = shouldLockDisableProps("successRedirectUrl");
  const seatsLocked = shouldLockDisableProps("seatsPerTimeSlotEnabled");

  const closeEventNameTip = () => setShowEventNameTip(false);

  const setEventName = (value: string) => formMethods.setValue("eventName", value);
  return (
    <div className="flex flex-col space-y-8">
      {/**
       * Only display calendar selector if user has connected calendars AND if it's not
       * a team event. Since we don't have logic to handle each attendee calendar (for now).
       * This will fallback to each user selected destination calendar.
       */}
      {!!connectedCalendarsQuery.data?.connectedCalendars.length && !team && (
        <div className="flex flex-col">
          <div className="flex justify-between">
            <Label>{t("add_to_calendar")}</Label>
            <Link
              href="/apps/categories/calendar"
              target="_blank"
              className="hover:text-emphasis text-default text-sm">
              {t("add_another_calendar")}
            </Link>
          </div>
          <div className="-mt-1 w-full">
            <Controller
              control={formMethods.control}
              name="destinationCalendar"
              defaultValue={eventType.destinationCalendar || undefined}
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  destinationCalendar={eventType.destinationCalendar}
                  value={value ? value.externalId : undefined}
                  onChange={onChange}
                  hidePlaceholder
                />
              )}
            />
          </div>
          <p className="text-default text-sm">{t("select_which_cal")}</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          label={t("event_name_in_calendar")}
          type="text"
          {...shouldLockDisableProps("eventName")}
          placeholder={eventNamePlaceholder}
          defaultValue={eventType.eventName || ""}
          {...formMethods.register("eventName")}
          addOnSuffix={
            <Button
              color="minimal"
              size="sm"
              aria-label="edit custom name"
              className="hover:stroke-3 hover:text-emphasis min-w-fit px-0 !py-0 hover:bg-transparent"
              onClick={() => setShowEventNameTip((old) => !old)}>
              <Edit className="h-4 w-4" />
            </Button>
          }
        />
      </div>
      <hr className="border-subtle" />
      <FormBuilder
        title={t("booking_questions_title")}
        description={t("booking_questions_description")}
        addFieldLabel={t("add_a_booking_question")}
        formProp="bookingFields"
        {...shouldLockDisableProps("bookingFields")}
        dataStore={{
          options: {
            locations: getLocationsOptionsForSelect(eventType?.locations ?? [], t),
          },
        }}
      />
      <hr className="border-subtle" />
      <RequiresConfirmationController
        eventType={eventType}
        seatsEnabled={seatsEnabled}
        metadata={eventType.metadata}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmation={setRequiresConfirmation}
      />
      <hr className="border-subtle" />
      <Controller
        name="hideCalendarNotes"
        control={formMethods.control}
        defaultValue={eventType.hideCalendarNotes}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("disable_notes")}
            {...shouldLockDisableProps("hideCalendarNotes")}
            description={t("disable_notes_description")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <hr className="border-subtle" />
      <Controller
        name="successRedirectUrl"
        control={formMethods.control}
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              title={t("redirect_success_booking")}
              {...successRedirectUrlLocked}
              description={t("redirect_url_description")}
              checked={redirectUrlVisible}
              onCheckedChange={(e) => {
                setRedirectUrlVisible(e);
                onChange(e ? value : "");
              }}>
              {/* Textfield has some margin by default we remove that so we can keep consistent alignment */}
              <div className="lg:-ml-2 lg:-mb-2">
                <TextField
                  className="w-full"
                  label={t("redirect_success_booking")}
                  labelSrOnly
                  disabled={successRedirectUrlLocked.disabled}
                  placeholder={t("external_redirect_url")}
                  required={redirectUrlVisible}
                  type="text"
                  defaultValue={eventType.successRedirectUrl || ""}
                  {...formMethods.register("successRedirectUrl")}
                />
                <div
                  className={classNames(
                    "p-1 text-sm text-orange-600",
                    formMethods.getValues("successRedirectUrl") ? "block" : "hidden"
                  )}>
                  {t("redirect_url_warning")}
                </div>
              </div>
            </SettingsToggle>
          </>
        )}
      />
      <hr className="border-subtle" />
      <SettingsToggle
        data-testid="hashedLinkCheck"
        title={t("private_link")}
        {...shouldLockDisableProps("hashedLinkCheck")}
        description={t("private_link_description", { appName: APP_NAME })}
        checked={hashedLinkVisible}
        onCheckedChange={(e) => {
          formMethods.setValue("hashedLink", e ? hashedUrl : undefined);
          setHashedLinkVisible(e);
        }}>
        {/* Textfield has some margin by default we remove that so we can keep consitant aligment */}
        <div className="lg:-ml-2">
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
              <Tooltip content={eventType.hashedLink ? t("copy_to_clipboard") : t("enabled_after_update")}>
                <Button
                  color="minimal"
                  size="sm"
                  type="button"
                  className="hover:stroke-3 hover:text-emphasis min-w-fit px-0 !py-0 hover:bg-transparent"
                  aria-label="copy link"
                  onClick={() => {
                    navigator.clipboard.writeText(placeholderHashedLink);
                    if (eventType.hashedLink) {
                      showToast(t("private_link_copied"), "success");
                    } else {
                      showToast(t("enabled_after_update_description"), "warning");
                    }
                  }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </Tooltip>
            }
          />
        </div>
      </SettingsToggle>
      <hr className="border-subtle" />
      <Controller
        name="seatsPerTimeSlotEnabled"
        control={formMethods.control}
        defaultValue={!!eventType.seatsPerTimeSlot}
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
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
                  formMethods.setValue("requiresConfirmation", false);
                  setRequiresConfirmation(false);
                  formMethods.setValue("seatsPerTimeSlot", 2);
                } else {
                  formMethods.setValue("seatsPerTimeSlot", null);
                  toggleGuests(true);
                }
                onChange(e);
              }}>
              <Controller
                name="seatsPerTimeSlot"
                control={formMethods.control}
                defaultValue={eventType.seatsPerTimeSlot}
                render={({ field: { value, onChange } }) => (
                  <div className="lg:-ml-2">
                    <TextField
                      required
                      name="seatsPerTimeSlot"
                      labelSrOnly
                      label={t("number_of_seats")}
                      type="number"
                      disabled={seatsLocked.disabled}
                      defaultValue={value || 2}
                      min={1}
                      className="w-24"
                      addOnSuffix={<>{t("seats")}</>}
                      onChange={(e) => {
                        onChange(Math.abs(Number(e.target.value)));
                      }}
                    />
                    <div className="mt-2">
                      <Checkbox
                        description={t("show_attendees")}
                        disabled={seatsLocked.disabled}
                        onChange={(e) => formMethods.setValue("seatsShowAttendees", e.target.checked)}
                        defaultChecked={!!eventType.seatsShowAttendees}
                      />
                    </div>
                  </div>
                )}
              />
            </SettingsToggle>
            {noShowFeeEnabled && <Alert severity="warning" title={t("seats_and_no_show_fee_error")} />}
          </>
        )}
      />
      {allowDisablingAttendeeConfirmationEmails(workflows) && (
        <>
          <hr className="border-subtle" />
          <Controller
            name="metadata.disableStandardEmails.confirmation.attendee"
            control={formMethods.control}
            render={({ field: { value, onChange } }) => (
              <>
                <SettingsToggle
                  title={t("disable_attendees_confirmation_emails")}
                  description={t("disable_attendees_confirmation_emails_description")}
                  checked={value || false}
                  onCheckedChange={(e) => {
                    formMethods.setValue("metadata.disableStandardEmails.confirmation.attendee", e);
                    onChange(e);
                  }}
                />
              </>
            )}
          />
        </>
      )}
      {allowDisablingHostConfirmationEmails(workflows) && (
        <>
          <hr className="border-subtle" />
          <Controller
            name="metadata.disableStandardEmails.confirmation.host"
            control={formMethods.control}
            defaultValue={!!eventType.seatsPerTimeSlot}
            render={({ field: { value, onChange } }) => (
              <>
                <SettingsToggle
                  title={t("disable_host_confirmation_emails")}
                  description={t("disable_host_confirmation_emails_description")}
                  checked={value || false}
                  onCheckedChange={(e) => {
                    formMethods.setValue("metadata.disableStandardEmails.confirmation.host", e);
                    onChange(e);
                  }}
                />
              </>
            )}
          />
        </>
      )}
      {showEventNameTip && (
        <CustomEventTypeModal
          close={closeEventNameTip}
          setValue={setEventName}
          defaultValue={formMethods.getValues("eventName") || eventType.eventName || ""}
          placeHolder={eventNamePlaceholder}
          event={eventNameObject}
        />
      )}
    </div>
  );
};
