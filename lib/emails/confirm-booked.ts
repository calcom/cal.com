import nodemailer from 'nodemailer';
import {serverConfig} from "../serverConfig";
import {CalendarEvent} from "../calendarClient";
import dayjs, {Dayjs} from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
};

export function integrationTypeToName(type: string): string {
  //TODO: When there are more complex integration type strings, we should consider using an extra field in the DB for that.
  const nameProto = type.split("_")[0];
  return nameProto.charAt(0).toUpperCase() + nameProto.slice(1);
}

export function formattedId(videoCallData: VideoCallData): string {
  switch(videoCallData.type) {
    case 'zoom_video':
      const strId = videoCallData.id.toString();
      const part1 = strId.slice(0, 3);
      const part2 = strId.slice(3, 7);
      const part3 = strId.slice(7, 11);
      return part1 + " " + part2 + " " + part3;
    default:
      return videoCallData.id.toString();
  }
}

export default function createConfirmBookedEmail(calEvent: CalendarEvent, cancelLink: string, rescheduleLink: string, options: any = {}, videoCallData?: VideoCallData) {
  return sendEmail(calEvent, cancelLink, rescheduleLink, {
    provider: {
      transport: serverConfig.transport,
      from: serverConfig.from,
    },
    ...options
  }, videoCallData);
}

const sendEmail = (calEvent: CalendarEvent, cancelLink: string, rescheduleLink: string, {
  provider,
}, videoCallData?: VideoCallData) => new Promise((resolve, reject) => {

  const {from, transport} = provider;
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);

  nodemailer.createTransport(transport).sendMail(
    {
      to: `${calEvent.attendees[0].name} <${calEvent.attendees[0].email}>`,
      from: `${calEvent.organizer.name} <${from}>`,
      replyTo: calEvent.organizer.email,
      subject: `Confirmed: ${calEvent.type} with ${calEvent.organizer.name} on ${inviteeStart.format('dddd, LL')}`,
      html: html(calEvent, cancelLink, rescheduleLink, videoCallData),
      text: text(calEvent, cancelLink, rescheduleLink, videoCallData),
    },
    (error, info) => {
      if (error) {
        console.error("SEND_BOOKING_CONFIRMATION_ERROR", calEvent.attendees[0].email, error);
        return reject(new Error(error));
      }
      return resolve();
    }
  )
});

const html = (calEvent: CalendarEvent, cancelLink, rescheduleLink: string, videoCallData?: VideoCallData) => {
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);
  return `
    <div>
      Hi ${calEvent.attendees[0].name},<br />
      <br />
      Your ${calEvent.type} with ${calEvent.organizer.name} at ${inviteeStart.format('h:mma')} 
      (${calEvent.attendees[0].timeZone}) on ${inviteeStart.format('dddd, LL')} is scheduled.<br />
      <br />` + (
      videoCallData ? `<strong>Video call provider:</strong> ${integrationTypeToName(videoCallData.type)}<br />
      <strong>Meeting ID:</strong> ${formattedId(videoCallData)}<br />
      <strong>Meeting Password:</strong> ${videoCallData.password}<br />
      <strong>Meeting URL:</strong> <a href="${videoCallData.url}">${videoCallData.url}</a><br /><br />` : ''
    ) + (
      calEvent.location ? `<strong>Location:</strong> ${calEvent.location}<br /><br />` : ''
    ) +
    `<strong>Additional notes:</strong><br />
      ${calEvent.description}<br />
      <br />
      Need to change this event?<br />
      Cancel: <a href="${cancelLink}">${cancelLink}</a><br />
      Reschedule: <a href="${rescheduleLink}">${rescheduleLink}</a>
    </div>
  `;
};

const text = (evt: CalendarEvent, cancelLink: string, rescheduleLink: string, videoCallData?: VideoCallData) => html(evt, cancelLink, rescheduleLink, videoCallData).replace('<br />', "\n").replace(/<[^>]+>/g, '');