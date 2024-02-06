import { DisableStandardEmailsConfirmation } from "event-type/components/disable-standard-emails-confirmation";
import { Edit } from "lucide-react";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import type { Prisma } from "@calcom/prisma/client";
import { Button, Label, TextField } from "@calcom/ui";

import { EnablePrivateURL } from "../../components/enable-private-url/index";
import { EventCalendarView } from "../../components/event-calendar-view/index";
import { HideCalendarNotes } from "../../components/hide-calendar-notes/index";
import { LockTimeZoneToggleOnBookingPage } from "../../components/lock-timezone-on-booking-page/index";
import { RedirectOnBooking } from "../../components/redirect-on-booking/index";
import { RequiresBookerEmailVerification } from "../../components/require-booker-email-verification/index";
import type { FormValues } from "../../types";
import type { EventTypeSetupProps } from "../event-setup/index";

type AdvancedProps = {
  eventType: Pick<EventTypeSetupProps, "eventType" | "team">;
  team: Pick<EventTypeSetupProps, "eventType" | "team">;
  userTheme: string | null | undefined;
  userConnectedCalendars: [];
};

export function Advanced({ eventType, team, userTheme, userConnectedCalendars }: AdvancedProps) {
  const formMethods = useFormContext<FormValues>();
  const bookingFields: Prisma.JsonObject = {};
  const selectedThemeIsDark =
    userTheme === "dark" ||
    (!userTheme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    "Members will not be able to edit this",
    "This option was locked by the team admin"
  );
  const successRedirectUrlLocked = shouldLockDisableProps("successRedirectUrl");
  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);

  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [hashedLinkVisible, setHashedLinkVisible] = useState(!!eventType.hashedLink);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!eventType.successRedirectUrl);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);

  return (
    <div className="flex flex-col space-y-4">
      <div className="border-subtle space-y-6 rounded-lg border p-6">
        {!!userConnectedCalendars.length && !team && (
          <div className="flex flex-col">
            <div className="flex justify-between">
              <div>
                <Label className="text-emphasis mb-0 font-medium">Add to calendar</Label>
              </div>
              <a
                href="/apps/categories/calendar"
                target="_blank"
                className="hover:text-emphasis text-default text-sm">
                Add another calendar
              </a>
            </div>
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
                  hideAdvancedText
                />
              )}
            />
            <p className="text-subtle text-sm">Select which calendar to add bookings to</p>
          </div>
        )}
        <div className="w-full">
          <TextField
            label="Event name in calendar"
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
                className="hover:stroke-3 hover:text-emphasis min-w-fit !py-0 px-0 hover:bg-transparent"
                onClick={() => setShowEventNameTip((old) => !old)}>
                <Edit className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
      <EventCalendarView
        formMethods={formMethods}
        team={team}
        userConnectedCalendars={userConnectedCalendars}
        shouldLockDisableProps={shouldLockDisableProps}
      />

      <BookerLayoutSelector fallbackToUserSettings isDark={selectedThemeIsDark} isOuterBorder={true} />

      <div className="border-subtle space-y-6 rounded-lg border p-6">
        <FormBuilder
          title="Booking questions"
          description="Customize the questions asked on the booking page"
          addFieldLabel="Add a question"
          formProp="bookingFields"
          {...shouldLockDisableProps("bookingFields")}
          dataStore={{
            options: {
              locations: getLocationsOptionsForSelect(eventType?.locations ?? [], t),
            },
          }}
        />
      </div>

      {/* Requires confirmation controller comes here */}

      {/* Requires booker email verification controller comes here */}
      <RequiresBookerEmailVerification
        formMethods={formMethods}
        shouldLockDisableProps={shouldLockDisableProps}
        defaultValue={eventType.requiresBookerEmailVerification}
      />

      {/* Hide calendar notes controller comes here */}
      <HideCalendarNotes
        formMethods={formMethods}
        shouldLockDisableProps={shouldLockDisableProps}
        defaultValue={eventType.hideCalendarNotes}
      />

      {/* Redirect on booking controller comes here */}
      <RedirectOnBooking
        formMethods={formMethods}
        defaultValue={eventType.successRedirectUrl}
        isRedirectUrlVisible={!!eventType.successRedirectUrl}
        successRedirectUrlLocked={successRedirectUrlLocked}
      />

      {/* Enable private URL controller comes here */}
      <EnablePrivateURL />

      {/* Lock timezone on booking page controller comes here */}
      <LockTimeZoneToggleOnBookingPage
        formMethods={formMethods}
        defaultValue={eventType.lockTimeZoneToggleOnBookingPage}
        shouldLockDisableProps={shouldLockDisableProps}
      />

      {/* allow disabling attendee confirmation emails controller comes here */}
      {allowDisablingAttendeeConfirmationEmails(workflows) && (
        <DisableStandardEmailsConfirmation
          formMethods={formMethods}
          name="metadata.disableStandardEmails.confirmation.attendee"
          title="Disable default confirmation emails for attendees"
          description="At least one workflow is active on this event type that sends an email to the attendees when the event is booked."
        />
      )}

      {/* allow disabling host confirmation emails controller comes here */}
      {allowDisablingHostConfirmationEmails(workflows) && (
        <DisableStandardEmailsConfirmation
          formMethods={formMethods}
          defaultValue={!!eventType.seatsPerTimeSlot}
          name="metadata.disableStandardEmails.confirmation.host"
          title="Disable default confirmation emails for host"
          description="At least one workflow is active on this event type that sends an email to the host when the event is booked."
        />
      )}
    </div>
  );
}
