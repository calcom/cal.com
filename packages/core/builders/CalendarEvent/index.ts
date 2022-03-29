import { CalendarEvent } from "@calcom/types/Calendar";

export class CalendarEventBuilder {
  private event: CalendarEvent;

  constructor(props: CalendarEvent) {
    this.event = props;
  }

  public buildDescription(description: CalendarEvent["description"]) {
    this.event.description = description;
    return this.event;
  }

  public buildTeam(team: CalendarEvent["team"]) {
    this.event.team = team;
    return this.event;
  }

  public buildLocation(location: CalendarEvent["location"]) {
    this.event.location = location;
    return this.event;
  }

  public buildConferenceData(conferenceData: CalendarEvent["conferenceData"]) {
    this.event.conferenceData = conferenceData;
    return this.event;
  }

  public buildAdditionalInformation(additionalInformation: CalendarEvent["additionInformation"]) {
    this.event.additionInformation = additionalInformation;
    return this.event;
  }

  public buildUID(UID: CalendarEvent["uid"]) {
    this.event.uid = UID;
    return this.event;
  }

  public buildVideoCallData(videoCallData: CalendarEvent["videoCallData"]) {
    this.event.videoCallData = videoCallData;
    return this.event;
  }

  public buildPaymentInfo(paymentInfo: CalendarEvent["paymentInfo"]) {
    this.event.paymentInfo = paymentInfo;
    return this.event;
  }

  public buildDestinationCalendar(destinationCalendar: CalendarEvent["destinationCalendar"]) {
    this.event.destinationCalendar = destinationCalendar;
    return this.event;
  }

  public buildCancellationReason(cancellationReason: CalendarEvent["cancellationReason"]) {
    this.event.cancellationReason = cancellationReason;
    return this.event;
  }

  public buildRejectionReason(rejectionReason: CalendarEvent["rejectionReason"]) {
    this.event.rejectionReason = rejectionReason;
    return this.event;
  }
}
