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

export default function createConfirmBookedEmail(calEvent: CalendarEvent, cancelLink: string, rescheduleLink: string, options: any = {}) {
  return sendEmail(calEvent, cancelLink, rescheduleLink, {
    provider: {
      transport: serverConfig.transport,
      from: serverConfig.from,
    },
    ...options
  });
}

const sendEmail = (calEvent: CalendarEvent, cancelLink: string, rescheduleLink: string, {
  provider,
}) => new Promise( (resolve, reject) => {

  const { from, transport } = provider;
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);

  nodemailer.createTransport(transport).sendMail(
    {
      to: `${calEvent.attendees[0].name} <${calEvent.attendees[0].email}>`,
      from: `${calEvent.organizer.name} <${from}>`,
      replyTo: calEvent.organizer.email,
      subject: `Confirmed: ${calEvent.type} with ${calEvent.organizer.name} on ${inviteeStart.format('dddd, LL')}`,
      html: html(calEvent, cancelLink, rescheduleLink),
      text: text(calEvent, cancelLink, rescheduleLink),
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

const html = (calEvent: CalendarEvent, cancelLink: string, rescheduleLink: string) => {
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);
  return `
    <div>
      Hi ${calEvent.attendees[0].name},<br />
      <br />
      Your ${calEvent.type} with ${calEvent.organizer.name} at ${inviteeStart.format('h:mma')} 
      (${calEvent.attendees[0].timeZone}) on ${inviteeStart.format('dddd, LL')} is scheduled.<br />
      <br />` + (
        calEvent.location ? `<strong>Location:</strong> ${calEvent.location}<br /><br />` : ''
      ) +
      `Additional notes:<br />
      ${calEvent.description}<br />
      <br />
      Need to change this event?<br />
      Cancel: <a href="${cancelLink}">${cancelLink}</a><br />
      Reschedule: <a href="${rescheduleLink}">${rescheduleLink}</a>
    </div>
  `;
};

const text = (evt: CalendarEvent, cancelLink: string, rescheduleLink: string) => html(evt, cancelLink, rescheduleLink).replace('<br />', "\n").replace(/<[^>]+>/g, '');