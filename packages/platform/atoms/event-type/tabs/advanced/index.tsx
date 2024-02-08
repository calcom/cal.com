import { OfferSeatsPerTimeSlot } from "event-type/components/offer-seats-per-time-slot";
import { UserSelectedDestinationCalendar } from "event-type/components/user-selected-destination-calendar";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import getLocationsOptionsForSelect from "@calcom/features/bookings/lib/getLocationOptionsForSelect";
import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import { FormBuilder } from "@calcom/features/form-builder/FormBuilder";
import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import { CAL_URL } from "@calcom/lib/constants";
import type { Prisma } from "@calcom/prisma/client";

import { DisableStandardEmailsConfirmation } from "../../components/disable-standard-emails-confirmation/index";
import { EnablePrivateURL } from "../../components/enable-private-url/index";
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
  const seatsLocked = shouldLockDisableProps("seatsPerTimeSlotEnabled");
  const noShowFeeEnabled =
    formMethods.getValues("metadata")?.apps?.stripe?.enabled === true &&
    formMethods.getValues("metadata")?.apps?.stripe?.paymentOption === "HOLD";
  const workflows = eventType.workflows.map((workflowOnEventType) => workflowOnEventType.workflow);

  const [showEventNameTip, setShowEventNameTip] = useState(false);
  const [redirectUrlVisible, setRedirectUrlVisible] = useState(!!eventType.successRedirectUrl);
  const [hashedUrl, setHashedUrl] = useState(eventType.hashedLink?.link);
  const [requiresConfirmation, setRequiresConfirmation] = useState(eventType.requiresConfirmation);

  const placeholderHashedLink = `${CAL_URL}/d/${hashedUrl}/${formMethods.getValues("slug")}`;

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
      })
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <UserSelectedDestinationCalendar
        eventType={eventType}
        formMethods={formMethods}
        shouldLockDisableProps={shouldLockDisableProps}
        isConnectedConnectedPresent={!!userConnectedCalendars.length}
        isTeamPresent={!team}
        toggleEventNameTip={() => setShowEventNameTip((old) => !old)}
        // TODO: figure this part out
        eventNamePlaceholder=""
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
      <EnablePrivateURL
        formMethods={formMethods}
        isHashedLinkVisible={!!formMethods.getValues("hashedLink")}
        hashedUrl={hashedUrl}
        hashedLink={formMethods.getValues("hashedLink")}
        shouldLockDisableProps={shouldLockDisableProps}
        placeholderHashedLink={placeholderHashedLink}
      />

      {/*seatsPerTimeSlotEnabled controller goes here*/}
      <OfferSeatsPerTimeSlot
        seatsLocked={seatsLocked}
        isNoShowFeeEnabled={noShowFeeEnabled}
        enableRequiresConfirmation={() => {
          toggleGuests(false);
          formMethods.setValue("requiresConfirmation", false);
          setRequiresConfirmation(false);
          formMethods.setValue("metadata.multipleDuration", undefined);
          formMethods.setValue("seatsPerTimeSlot", eventType.seatsPerTimeSlot ?? 2);
        }}
        disableRequiresConfirmation={() => {
          formMethods.setValue("seatsPerTimeSlot", null);
          toggleGuests(true);
        }}
      />

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
