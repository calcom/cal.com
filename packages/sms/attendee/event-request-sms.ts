import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import SMSManager from "../sms-manager";

export default class EventRequestSMS extends SMSManager {
  constructor(calEvent: CalendarEvent) {
    super(calEvent);
  }

  getMessage(attendee: Person) {
    const t = attendee.language.translate;

    const bookingSubmittedText = t("booking_submitted", {
      name: attendee.name,
      interpolation: { escapeValue: false },
    });

    const bookingUrl = `${this.calEvent.bookerUrl ?? WEBAPP_URL}/booking/${this.calEvent.uid}`;
    const urlText = t("you_can_view_booking_details_with_this_url", {
      url: bookingUrl,
      interpolation: { escapeValue: false },
    });

    const userNeedsToConfirmOrRejectBookingText = t("user_needs_to_confirm_or_reject_booking", {
      user: this.calEvent.organizer.name,
      interpolation: { escapeValue: false },
    });

    const messageText = `${bookingSubmittedText}. ${userNeedsToConfirmOrRejectBookingText}\n\n${urlText}`;

    return messageText;
  }
}
