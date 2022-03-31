import { CalendarEvent } from "@calcom/types/Calendar";

export class CalendarEventBuilder {
  private event: CalendarEvent;

  constructor(props: CalendarEvent) {
    this.event = props;
  }

  public get() {
    return this.event;
  }

  public setDescription(description: CalendarEvent["description"]) {
    this.event.description = description;
    return this.event;
  }

  public setTeam(team: CalendarEvent["team"]) {
    this.event.team = team;
    return this.event;
  }

  public setLocation(location: CalendarEvent["location"]) {
    this.event.location = location;
    return this.event;
  }

  public setConferenceData(conferenceData: CalendarEvent["conferenceData"]) {
    this.event.conferenceData = conferenceData;
    return this.event;
  }

  public setAdditionalInformation(additionalInformation: CalendarEvent["additionInformation"]) {
    this.event.additionInformation = additionalInformation;
    return this.event;
  }

  public setUID(UID: CalendarEvent["uid"]) {
    this.event.uid = UID;
    return this.event;
  }

  public setVideoCallData(videoCallData: CalendarEvent["videoCallData"]) {
    this.event.videoCallData = videoCallData;
    return this.event;
  }

  public setPaymentInfo(paymentInfo: CalendarEvent["paymentInfo"]) {
    this.event.paymentInfo = paymentInfo;
    return this.event;
  }

  public setDestinationCalendar(destinationCalendar: CalendarEvent["destinationCalendar"]) {
    this.event.destinationCalendar = destinationCalendar;
    return this.event;
  }

  public setCancellationReason(cancellationReason: CalendarEvent["cancellationReason"]) {
    this.event.cancellationReason = cancellationReason;
    return this.event;
  }

  public setRejectionReason(rejectionReason: CalendarEvent["rejectionReason"]) {
    this.event.rejectionReason = rejectionReason;
    return this.event;
  }
}
