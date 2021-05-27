
import nodemailer from 'nodemailer';
import dayjs, { Dayjs } from "dayjs";
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { createEvent } from 'ics';
import { CalendarEvent } from '../calendarClient';
import { serverConfig } from '../serverConfig';

dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function createNewEventEmail(calEvent: CalendarEvent, options: any = {}) {
  return sendEmail(calEvent, {
    provider: {
      transport: serverConfig.transport,
      from: serverConfig.from,
    },
    ...options
  });
}

// converts "2021-05-27T16:59:09+01:00" to [ 2021, 5, 27, 15, 59, 9 ]
const convertIsoDateToUtcDateArr = (isoDate: string): [] => {
  const isoUtcDate: string = dayjs(isoDate).utc().format();
  return Array.prototype.concat(
    ...isoUtcDate.substr(0, isoUtcDate.indexOf('+')).split('T')
      .map(
        (parts) => parts.split('-').length > 1 ? parts.split('-').map(
          (n) => parseInt(n, 10)
        ) : parts.split(':').map(
          (n) => parseInt(n, 10)
        )
      ));
}


const icalEventAsString = (calEvent: CalendarEvent): string => {
  const icsEvent = createEvent({
    start: convertIsoDateToUtcDateArr(calEvent.startTime),
    startInputType: 'utc',
    productId: 'calendso/ics',
    title: `${calEvent.type} with ${calEvent.attendees[0].name}`,
    description: calEvent.description,
    duration: { minutes: dayjs(calEvent.endTime).diff(dayjs(calEvent.startTime), 'minute') },
    organizer: { name: calEvent.organizer.name, email: calEvent.organizer.email },
    attendees: calEvent.attendees.map( (attendee: any) => ({ name: attendee.name, email: attendee.email }) ),
    status: "CONFIRMED",
  });
  if (icsEvent.error) {
    throw icsEvent.error;
  }
  return icsEvent.value;
}

const sendEmail = (calEvent: CalendarEvent, {
  provider,
}) => new Promise( (resolve, reject) => {
  const { transport, from } = provider;
  const organizerStart: Dayjs = <Dayjs>dayjs(calEvent.startTime).tz(calEvent.organizer.timeZone);
  nodemailer.createTransport(transport).sendMail(
    {
      icalEvent: {
        filename: 'event.ics',
        content: icalEventAsString(calEvent),
      },
      from,
      to: calEvent.organizer.email,
      subject: `New event: ${calEvent.attendees[0].name} - ${organizerStart.format('LT dddd, LL')} - ${calEvent.type}`,
      html: html(calEvent),
      text: text(calEvent),
    },
    (error) => {
      if (error) {
        console.error("SEND_NEW_EVENT_NOTIFICATION_ERROR", calEvent.organizer.email, error);
        return reject(new Error(error));
      }
      return resolve();
    });
});

const html = (evt: CalendarEvent) => `
  <div>
    Hi ${evt.organizer.name},<br />
    <br />
    A new event has been scheduled.<br />
    <br />
    <strong>Event Type:</strong><br />
    ${evt.type}<br />
    <br />
    <strong>Invitee Email:</strong><br />
    <a href=\\"mailto:${evt.attendees[0].email}\\">${evt.attendees[0].email}</a><br />
    <br />
    <strong>Invitee Time Zone:</strong><br />
    ${evt.attendees[0].timeZone}<br />
    <br />
    <strong>Additional notes:</strong><br />
    ${evt.description}
  </div>
`;

// just strip all HTML and convert <br /> to \n
const text = (evt: CalendarEvent) => html(evt).replace('<br />', "\n").replace(/<[^>]+>/g, '');