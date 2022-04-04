import { CalendarEvent, Person } from "@calcom/types/Calendar";

import { getEventName } from "../../../../apps/web/lib/event";
import { CalendarEventBuilder } from "./builder";

export default class CalendarEventDirector {
  private builder: CalendarEventBuilder;

  constructor(props: CalendarEventBuilder) {
    this.builder = new CalendarEventBuilder(props);
  }

  public async buildRequiredParams() {
    if (this.builder.isTimeInPast(this.builder.start)) {
      throw new Error(`Booking ${this.builder.eventTypeId} failed`);
    }
    const eventTypeId = this.builder.booking.eventTypeId;

    await this.builder.buildEventType(eventTypeId);

    await this.builder.buildUsers(this.builder.eventType.users);

    await this.builder.buildOrganizerFromUserId(this.builder.users[0].id);

    await this.builder.setOrganizerLanguage(this.builder.organizer?.language);

    this.builder.buildInvitee();
    this.builder.buildGuest();
    this.builder.buildAttendeesList();
    // this.buildTeam();
    // this.buildUID();
    this.builder.buildDescription();
    this.builder.buildEventNameObject();
    // this.builder = new CalendarEventBuilder({
    //   type: this.builder.eventType.title,
    //   title: this.builder.eventNameObject ? getEventName(this.builder.eventNameObject) : "Nameless Event", //this needs to be either forced in english, or fetched for each attendee and organizer separately
    //   startTime: this.builder.start,
    //   endTime: this.builder.end,
    //   organizer: {
    //     name: this.builder.organizer.name || "Nameless",
    //     email: this.builder.organizer.email || "Email-less",
    //     timeZone: this.builder.organizer.timeZone,
    //     language: {
    //       translate: this.builder.translationOwner,
    //       locale: this.builder.organizer?.locale ?? "en",
    //     },
    //   },
    //   attendees: this.builder.attendeesList || [],
    // }).getEvent();

    return this.builder.getEvent();
  }
}
