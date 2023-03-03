import Link from "next/link";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { APP_NAME, CAL_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Label,
  SettingsToggle,
  showToast,
  TextField,
  Tooltip,
} from "@calcom/ui";
import { FiEdit, FiCopy } from "@calcom/ui/components/icon";

import RequiresConfirmationController from "./RequiresConfirmationController";

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
  const eventNameObject: EventNameObjectType = {
    attendeeName: t("scheduler"),
    eventType: eventType.title,
    eventName: eventType.eventName,
    host: eventType.users[0]?.name || "Nameless",
    t,
  };
  const [previewText, setPreviewText] = useState(getEventName(eventNameObject));
  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);
  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;
  const seatsEnabled = formMethods.watch("seatsPerTimeSlotEnabled");

  const replaceEventNamePlaceholder = (eventNameObject: EventNameObjectType, previewEventName: string) =>
    previewEventName
      .replace("{Event type title}", eventNameObject.eventType)
      .replace("{Scheduler}", eventNameObject.attendeeName)
      .replace("{Organiser}", eventNameObject.host);

  const changePreviewText = (eventNameObject: EventNameObjectType, previewEventName: string) => {
    setPreviewText(replaceEventNamePlaceholder(eventNameObject, previewEventName));
  };

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

  const eventNamePlaceholder = replaceEventNamePlaceholder(eventNameObject, t("meeting_with_user"));

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
              className="text-sm text-gray-600 hover:text-gray-900">
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
          <p className="text-sm text-gray-600">{t("select_which_cal")}</p>
        </div>
      )}
      <div className="w-full">
        <TextField
          label={t("event_name_in_calendar")}
          type="text"
          placeholder={eventNamePlaceholder}
          defaultValue={eventType.eventName || ""}
          {...formMethods.register("eventName", {
            onChange: (e) => {
              if (!e.target.value || !formMethods.getValues("eventName")) {
                return setPreviewText(getEventName(eventNameObject));
              }
              changePreviewText(eventNameObject, e.target.value);
            },
          })}
          addOnSuffix={
            <Button
              type="button"
              StartIcon={FiEdit}
              variant="icon"
              color="minimal"
              className="hover:stroke-3 min-w-fit px-0 hover:bg-transparent hover:text-black"
              onClick={() => setShowEventNameTip((old) => !old)}
            />
          }
        />
      </div>
      <hr />
      <FormBuilder
        title={t("booking_questions_title")}
        description={t("booking_questions_description")}
        addFieldLabel={t("add_a_booking_question")}
        formProp="bookingFields"
      />
      <hr />
      <RequiresConfirmationController
        seatsEnabled={seatsEnabled}
        metadata={eventType.metadata}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmation={setRequiresConfirmation}
      />
      <hr />
      <Controller
        name="hideCalendarNotes"
        control={formMethods.control}
        defaultValue={eventType.hideCalendarNotes}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("disable_notes")}
            description={t("disable_notes_description")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
          />
        )}
      />
      <hr />
      <Controller
        name="successRedirectUrl"
        control={formMethods.control}
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              title={t("redirect_success_booking")}
              description={t("redirect_url_description")}
              checked={redirectUrlVisible}
              onCheckedChange={(e) => {
                setRedirectUrlVisible(e);
                onChange(e ? value : "");
              }}>
              {/* Textfield has some margin by default we remove that so we can keep consitant aligment */}
              <div className="lg:-ml-2">
                <TextField
                  label={t("redirect_success_booking")}
                  labelSrOnly
                  placeholder={t("external_redirect_url")}
                  required={redirectUrlVisible}
                  type="text"
                  defaultValue={eventType.successRedirectUrl || ""}
                  {...formMethods.register("successRedirectUrl")}
                />
                <div className="mt-2 flex">
                  <Checkbox
                    description={t("disable_success_page")}
                    // Disable if it's not Self Hosted or if the redirect url is not set
                    disabled={!IS_SELF_HOSTED || !formMethods.watch("successRedirectUrl")}
                    {...formMethods.register("metadata.disableSuccessPage")}
                  />
                  {/*TODO: Extract it out into a component when used more than once*/}
                  {!IS_SELF_HOSTED && (
                    <Link href="https://cal.com/pricing" target="_blank">
                      <Badge variant="orange" className="ml-2">
                        Platform Only
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
            </SettingsToggle>
          </>
        )}
      />
      <hr />
      <SettingsToggle
        data-testid="hashedLinkCheck"
        title={t("private_link")}
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
                  onClick={() => {
                    navigator.clipboard.writeText(placeholderHashedLink);
                    if (eventType.hashedLink) {
                      showToast(t("private_link_copied"), "success");
                    } else {
                      showToast(t("enabled_after_update_description"), "warning");
                    }
                  }}
                  className="hover:stroke-3 hover:bg-transparent hover:text-black"
                  type="button">
                  <FiCopy />
                </Button>
              </Tooltip>
            }
          />
        </div>
      </SettingsToggle>
      <hr />
      <Controller
        name="seatsPerTimeSlotEnabled"
        control={formMethods.control}
        defaultValue={!!eventType.seatsPerTimeSlot}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("offer_seats")}
            description={t("offer_seats_description")}
            checked={value}
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
                    defaultValue={value || 2}
                    min={1}
                    addOnSuffix={<>{t("seats")}</>}
                    onChange={(e) => {
                      onChange(Math.abs(Number(e.target.value)));
                    }}
                  />
                  <div className="mt-2">
                    <Checkbox
                      description={t("show_attendees")}
                      onChange={(e) => formMethods.setValue("seatsShowAttendees", e.target.checked)}
                      defaultChecked={!!eventType.seatsShowAttendees}
                    />
                  </div>
                </div>
              )}
            />
          </SettingsToggle>
        )}
      />

      {showEventNameTip && (
        <Dialog open={showEventNameTip} onOpenChange={setShowEventNameTip}>
          <DialogContent
            title={t("custom_event_name")}
            description={t("custom_event_name_description")}
            type="creation"
            enableOverflow>
            <TextField
              label={t("event_name_in_calendar")}
              type="text"
              placeholder={eventNamePlaceholder}
              defaultValue={eventType.eventName || ""}
              {...formMethods.register("eventName", {
                onChange: (e) => {
                  if (!e.target.value || !formMethods.getValues("eventName")) {
                    return setPreviewText(getEventName(eventNameObject));
                  }
                  changePreviewText(eventNameObject, e.target.value);
                },
              })}
              className="mb-0"
            />
            <div className="text-sm">
              <div className="mb-6 rounded-md bg-gray-100 p-2">
                <h1 className="mb-2 ml-1 font-medium text-gray-900">{t("available_variables")}</h1>
                <div className="mb-2.5 flex font-normal">
                  <p className="ml-1 mr-5 w-28 text-gray-400">{`{Event type title}`}</p>
                  <p className="text-gray-900">{t("event_name_info")}</p>
                </div>
                <div className="mb-2.5 flex font-normal">
                  <p className="ml-1 mr-5 w-28 text-gray-400">{`{Organiser}`}</p>
                  <p className="text-gray-900">{t("your_full_name")}</p>
                </div>
                <div className="mb-2.5 flex font-normal">
                  <p className="ml-1 mr-5 w-28 text-gray-400">{`{Scheduler}`}</p>
                  <p className="text-gray-900">{t("scheduler_full_name")}</p>
                </div>
                <div className="mb-1 flex font-normal">
                  <p className="ml-1 mr-5 w-28 text-gray-400">{`{Location}`}</p>
                  <p className="text-gray-900">{t("location_info")}</p>
                </div>
              </div>
              <h1 className="mb-2 text-[14px] font-medium leading-4">{t("preview")}</h1>
              <div
                className="flex h-[212px] w-full rounded-md border-y bg-cover bg-center"
                style={{
                  backgroundImage: "url(/calendar-preview.svg)",
                }}>
                <div className="m-auto flex items-center justify-center self-stretch">
                  <div className="mt-3 ml-11 box-border h-[110px] w-[120px] flex-col items-start gap-1 rounded-md border border-solid border-black bg-gray-100 text-[12px] leading-3">
                    <p className="overflow-hidden text-ellipsis p-1.5 font-medium text-gray-900">
                      {previewText}
                    </p>
                    <p className="ml-1.5 text-[10px] font-normal text-gray-600">8 - 10 AM</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose onClick={() => formMethods.setValue("eventName", eventType.eventName ?? "")}>
                {t("cancel")}
              </DialogClose>
              <Button color="primary" onClick={() => setShowEventNameTip(false)}>
                {t("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
