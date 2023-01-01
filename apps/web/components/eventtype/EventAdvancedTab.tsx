import Link from "next/link";
import type { CustomInputParsed, EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import CustomInputItem from "@calcom/features/eventtypes/components/CustomInputItem";
import { APP_NAME, CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Icon,
  Label,
  SettingsToggle,
  showToast,
  TextField,
  Tooltip,
} from "@calcom/ui";

import CustomInputTypeForm from "@components/eventtype/CustomInputTypeForm";

import RequiresConfirmationController from "./RequiresConfirmationController";

const generateHashedLink = (id: number) => {
  const translator = short();
  const seed = `${id}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return uid;
};

const getRandomId = (length = 8) => {
  return (
    -1 *
    parseInt(
      Math.ceil(Math.random() * Date.now())
        .toPrecision(length)
        .toString()
        .replace(".", "")
    )
  );
};

export const EventAdvancedTab = ({ eventType, team }: Pick<EventTypeSetupProps, "eventType" | "team">) => {
  const connectedCalendarsQuery = trpc.viewer.connectedCalendars.useQuery();
  const formMethods = useFormContext<FormValues>();
  const { t } = useLocale();
  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!eventType.successRedirectUrl);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const [customInputs, setCustomInputs] = useState<CustomInputParsed[]>(
    eventType.customInputs.sort((a, b) => a.id - b.id) || []
  );
  const [selectedCustomInput, setSelectedCustomInput] = useState<CustomInputParsed | undefined>(undefined);
  const [selectedCustomInputModalOpen, setSelectedCustomInputModalOpen] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);
  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${eventType.slug}`;
  const seatsEnabled = formMethods.getValues("seatsPerTimeSlotEnabled");

  const removeCustom = (index: number) => {
    formMethods.getValues("customInputs").splice(index, 1);
    customInputs.splice(index, 1);
    setCustomInputs([...customInputs]);
  };

  useEffect(() => {
    !hashedUrl && setHashedUrl(generateHashedLink(eventType.users[0]?.id ?? team?.id));
  }, [eventType.users, hashedUrl, team?.id]);

  useEffect(() => {
    if (eventType.customInputs) {
      setCustomInputs(eventType.customInputs.sort((a, b) => a.id - b.id));
    }
  }, [eventType.customInputs]);

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
            <Link href="/apps/categories/calendar">
              <a target="_blank" className="text-sm text-gray-600 hover:text-gray-900">
                {t("add_another_calendar")}
              </a>
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
          label={t("event_name")}
          type="text"
          placeholder={t("meeting_with_user", { attendeeName: eventType.users[0]?.name })}
          defaultValue={eventType.eventName || ""}
          {...formMethods.register("eventName")}
          addOnSuffix={
            <Button
              type="button"
              StartIcon={Icon.FiEdit}
              size="icon"
              color="minimal"
              className="hover:stroke-3 min-w-fit px-0 hover:bg-transparent hover:text-black"
              onClick={() => setShowEventNameTip((old) => !old)}
            />
          }
        />
      </div>
      <hr />
      <div className="">
        <SettingsToggle
          title={t("additional_inputs")}
          description={t("additional_input_description")}
          checked={customInputs.length > 0}
          onCheckedChange={(e) => {
            if (e && customInputs.length === 0) {
              // Push a placeholders
              setSelectedCustomInputModalOpen(true);
            } else if (!e) {
              formMethods.setValue("customInputs", []);
            }
          }}>
          <ul className="my-4 rounded-md border">
            {customInputs.map((customInput, idx) => (
              <CustomInputItem
                key={idx}
                question={customInput.label}
                type={customInput.type}
                required={customInput.required}
                editOnClick={() => {
                  setSelectedCustomInput(customInput);
                  setSelectedCustomInputModalOpen(true);
                }}
                deleteOnClick={() => removeCustom(idx)}
              />
            ))}
          </ul>
          {customInputs.length > 0 && (
            <Button
              StartIcon={Icon.FiPlus}
              color="minimal"
              type="button"
              onClick={() => {
                setSelectedCustomInput(undefined);
                setSelectedCustomInputModalOpen(true);
              }}>
              {t("add_input")}
            </Button>
          )}
        </SettingsToggle>
      </div>
      <hr />
      <RequiresConfirmationController
        seatsEnabled={seatsEnabled}
        metadata={eventType.metadata}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmation={setRequiresConfirmation}
      />
      <hr />
      <Controller
        name="disableGuests"
        control={formMethods.control}
        defaultValue={eventType.disableGuests}
        render={({ field: { value, onChange } }) => (
          <SettingsToggle
            title={t("disable_guests")}
            description={t("disable_guests_description")}
            checked={value}
            onCheckedChange={(e) => onChange(e)}
            disabled={seatsEnabled}
          />
        )}
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
        name="metadata.additionalNotesRequired"
        control={formMethods.control}
        defaultValue={!!eventType.metadata.additionalNotesRequired}
        render={({ field: { value, onChange } }) => (
          <div className="flex space-x-3 ">
            <SettingsToggle
              title={t("require_additional_notes")}
              description={t("require_additional_notes_description")}
              checked={!!value}
              onCheckedChange={(e) => onChange(e)}
            />
          </div>
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
                  <Icon.FiCopy />
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
                formMethods.setValue("disableGuests", true);
                formMethods.setValue("requiresConfirmation", false);
                setRequiresConfirmation(false);
                formMethods.setValue("seatsPerTimeSlot", 2);
              } else {
                formMethods.setValue("seatsPerTimeSlot", null);
                formMethods.setValue("disableGuests", false);
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
            type="creation">
            <TextField
              label={t("event_name")}
              type="text"
              placeholder={t("meeting_with_user", { attendeeName: eventType.users[0]?.name })}
              defaultValue={eventType.eventName || ""}
              {...formMethods.register("eventName")}
            />
            <div className="mt-1 text-gray-500">
              <p>{`{HOST} = ${t("your_name")}`}</p>
              <p>{`{ATTENDEE} = ${t("attendee_name")}`}</p>
              <p>{`{HOST/ATTENDEE} = ${t("dynamically_display_attendee_or_organizer")}`}</p>
              <p>{`{LOCATION} = ${t("event_location")}`}</p>
            </div>
            <DialogFooter>
              <Button color="primary" onClick={() => setShowEventNameTip(false)}>
                {t("create")}
              </Button>
              <DialogClose onClick={() => formMethods.setValue("eventName", eventType.eventName ?? "")} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Controller
        name="customInputs"
        control={formMethods.control}
        defaultValue={customInputs}
        render={() => (
          <Dialog open={selectedCustomInputModalOpen} onOpenChange={setSelectedCustomInputModalOpen}>
            <DialogContent
              type="creation"
              Icon={Icon.FiPlus}
              title={t("add_new_custom_input_field")}
              description={t("this_input_will_shown_booking_this_event")}>
              <CustomInputTypeForm
                selectedCustomInput={selectedCustomInput}
                onSubmit={(values) => {
                  const customInput: CustomInputParsed = {
                    id: getRandomId(),
                    eventTypeId: -1,
                    label: values.label,
                    placeholder: values.placeholder,
                    required: values.required,
                    type: values.type,
                    options: values.options,
                    hasToBeCreated: true,
                  };
                  if (selectedCustomInput) {
                    selectedCustomInput.label = customInput.label;
                    selectedCustomInput.placeholder = customInput.placeholder;
                    selectedCustomInput.required = customInput.required;
                    selectedCustomInput.type = customInput.type;
                    selectedCustomInput.options = customInput.options || undefined;
                    selectedCustomInput.hasToBeCreated = false;
                    // Update by id
                    const inputIndex = customInputs.findIndex((input) => input.id === values.id);
                    customInputs[inputIndex] = selectedCustomInput;
                    setCustomInputs(customInputs);
                    formMethods.setValue("customInputs", customInputs);
                  } else {
                    const concatted = customInputs.concat({
                      ...customInput,
                      options: customInput.options,
                    });
                    console.log(concatted);
                    setCustomInputs(concatted);
                    formMethods.setValue("customInputs", concatted);
                  }

                  setSelectedCustomInputModalOpen(false);
                }}
                onCancel={() => {
                  setSelectedCustomInputModalOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      />
    </div>
  );
};
