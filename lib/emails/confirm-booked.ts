
import nodemailer from 'nodemailer';
import { serverConfig } from "../serverConfig";
import { CalendarEvent } from "../calendarClient";
import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function createConfirmBookedEmail(calEvent: CalendarEvent, options: any = {}) {
  return sendEmail(calEvent, {
    provider: {
      transport: serverConfig.transport,
      from: serverConfig.from,
    },
    ...options
  });
}

const sendEmail = (calEvent: CalendarEvent, {
  provider,
}) => new Promise( (resolve, reject) => {

  const { from, transport } = provider;
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);

  nodemailer.createTransport(transport).sendMail(
    {
      to: `${calEvent.attendees[0].name} <${calEvent.attendees[0].email}>`,
      from,
      subject: `Confirmed: ${calEvent.type} with ${calEvent.organizer.name} on ${inviteeStart.format('dddd, LL')}`,
      html: html(calEvent),
      text: text(calEvent),
    },
    (error, info) => {
      console.log(info);
      if (error) {
        console.error("SEND_BOOKING_CONFIRMATION_ERROR", calEvent.attendees[0].email, error);
        return reject(new Error(error));
      }
      return resolve();
    }
  )
});

const html = (calEvent: CalendarEvent) => {
  const inviteeStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.attendees[0].timeZone);
  return `
    <div>
      Hi ${calEvent.attendees[0].name},<br />
      <br />
      Your ${calEvent.type} with ${calEvent.organizer.name} at ${inviteeStart.format('h:mma')} 
      (${calEvent.attendees[0].timeZone}) on ${inviteeStart.format('dddd, LL')} is scheduled.<br />
      <br />
      Additional notes:<br />
      ${calEvent.description}
    </div>
  `;
};

const text = (evt: CalendarEvent) => html(evt).replace('<br />', "\n").replace(/<[^>]+>/g, '');