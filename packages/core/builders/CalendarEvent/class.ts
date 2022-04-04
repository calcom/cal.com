import { AdditionInformation, CalendarEvent, ConferenceData, Person } from "@calcom/types/Calendar";

import { DestinationCalendar } from ".prisma/client";

export default class CalendarEventClass implements CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  organizer: Person;
  attendees: Person[];
  description?: string | null | undefined;
  team?: { name: string; members: string[] } | undefined;
  location?: string | null | undefined;
  conferenceData?: ConferenceData | undefined;
  additionInformation?: AdditionInformation | undefined;
  uid?: string | null | undefined;
  videoCallData?: any;
  paymentInfo?: any;
  destinationCalendar?: DestinationCalendar | null | undefined;
  cancellationReason?: string | null | undefined;
  rejectionReason?: string | null | undefined;
  hideCalendarNotes?: boolean | undefined;

  constructor(props: CalendarEvent) {
    this.type = props.type;
    this.title = props.title;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.organizer = props.organizer;
    this.attendees = props.attendees;
  }

  public getEvent() {
    return this;
  }

  public setDescription(description: CalendarEvent["description"]) {
    this.description = description;
    return this;
  }

  public setTeam(team: CalendarEvent["team"]) {
    this.team = team;
    return this;
  }

  public setLocation(location: CalendarEvent["location"]) {
    this.location = location;
    return this;
  }

  public setConferenceData(conferenceData: CalendarEvent["conferenceData"]) {
    this.conferenceData = conferenceData;
    return this;
  }

  public setAdditionalInformation(additionalInformation: CalendarEvent["additionInformation"]) {
    this.additionInformation = additionalInformation;
    return this;
  }

  public setUID(UID: CalendarEvent["uid"]) {
    this.uid = UID;
    return this;
  }

  public setVideoCallData(videoCallData: CalendarEvent["videoCallData"]) {
    this.videoCallData = videoCallData;
    return this;
  }

  public setPaymentInfo(paymentInfo: CalendarEvent["paymentInfo"]) {
    this.paymentInfo = paymentInfo;
    return this;
  }

  public setDestinationCalendar(destinationCalendar: CalendarEvent["destinationCalendar"]) {
    this.destinationCalendar = destinationCalendar;
    return this;
  }

  public setCancellationReason(cancellationReason: CalendarEvent["cancellationReason"]) {
    this.cancellationReason = cancellationReason;
    return this;
  }

  public setRejectionReason(rejectionReason: CalendarEvent["rejectionReason"]) {
    this.rejectionReason = rejectionReason;
    return this;
  }

  public setHideCalendarNotes(hideCalendarNotes: CalendarEvent["hideCalendarNotes"]) {
    this.hideCalendarNotes = hideCalendarNotes;
    return this;
  }
}
