import {
  Appointment,
  Attendee,
  CalendarView,
  ConflictResolutionMode,
  DateTime,
  DeleteMode,
  ExchangeService,
  ExchangeVersion,
  FolderId,
  FolderView,
  ItemId,
  LegacyFreeBusyStatus,
  MessageBody,
  PropertySet,
  SendInvitationsMode,
  SendInvitationsOrCancellationsMode,
  Uri,
  WebCredentials,
  WellKnownFolderName,
} from "ews-javascript-api";

import { symmetricDecrypt } from "@calcom/lib/crypto";
// Probably don't need
// import { CALENDAR_INTEGRATIONS_TYPES } from "@calcom/lib/integrations/calendar/constants/generals";
import logger from "@calcom/lib/logger";
import type {
  Calendar,
  CalendarEvent,
  EventBusyDate,
  GetAvailabilityParams,
  IntegrationCalendar,
  NewCalendarEventType,
} from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

class ExchangeCalendarService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;
  private readonly exchangeVersion: ExchangeVersion;
  private credentials: Record<string, string>;

  constructor(credential: CredentialPayload) {
    // this.integrationName = CALENDAR_INTEGRATIONS_TYPES.exchange;
    this.integrationName = "exchange2016_calendar";

    this.log = logger.getSubLogger({ prefix: [`[[lib] ${this.integrationName}`] });

    const decryptedCredential = JSON.parse(
      symmetricDecrypt(credential.key?.toString() || "", process.env.CALENDSO_ENCRYPTION_KEY || "")
    );
    const username = decryptedCredential.username;
    const url = decryptedCredential.url;
    const password = decryptedCredential.password;

    this.url = url;

    this.credentials = {
      username,
      password,
    };
    this.exchangeVersion = ExchangeVersion.Exchange2016;
  }

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    try {
      const appointment = new Appointment(this.getExchangeService()); // service instance of ExchangeService
      appointment.Subject = event.title;
      appointment.Start = DateTime.Parse(event.startTime); // moment string
      appointment.End = DateTime.Parse(event.endTime); // moment string
      appointment.Location = event.location || "Location not defined!";
      appointment.Body = new MessageBody(event.description || ""); // you can not use any special character or escape the content

      for (let i = 0; i < event.attendees.length; i++) {
        appointment.RequiredAttendees.Add(new Attendee(event.attendees[i].email));
      }

      if (event.team?.members) {
        event.team.members.forEach((member) => {
          appointment.RequiredAttendees.Add(new Attendee(member.email));
        });
      }

      await appointment.Save(SendInvitationsMode.SendToAllAndSaveCopy);

      return {
        uid: appointment.Id.UniqueId,
        id: appointment.Id.UniqueId,
        password: "",
        type: "",
        url: "",
        additionalInfo: {},
      };
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateEvent(uid: string, event: CalendarEvent): Promise<any> {
    try {
      const appointment = await Appointment.Bind(
        this.getExchangeService(),
        new ItemId(uid),
        new PropertySet()
      );
      appointment.Subject = event.title;
      appointment.Start = DateTime.Parse(event.startTime); // moment string
      appointment.End = DateTime.Parse(event.endTime); // moment string
      appointment.Location = event.location || "Location not defined!";
      appointment.Body = new MessageBody(event.description || ""); // you can not use any special character or escape the content
      for (let i = 0; i < event.attendees.length; i++) {
        appointment.RequiredAttendees.Add(new Attendee(event.attendees[i].email));
      }
      if (event.team?.members) {
        event.team.members.forEach((member) => {
          appointment.RequiredAttendees.Add(new Attendee(member.email));
        });
      }
      appointment.Update(
        ConflictResolutionMode.AlwaysOverwrite,
        SendInvitationsOrCancellationsMode.SendToAllAndSaveCopy
      );
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  async deleteEvent(uid: string): Promise<void> {
    try {
      const appointment = await Appointment.Bind(
        this.getExchangeService(),
        new ItemId(uid),
        new PropertySet()
      );
      // Delete the appointment. Note that the item ID will change when the item is moved to the Deleted Items folder.
      appointment.Delete(DeleteMode.MoveToDeletedItems);
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  async getAvailability(params: GetAvailabilityParams): Promise<EventBusyDate[]> {
    const { dateFrom, dateTo, selectedCalendars } = params;
    try {
      const externalCalendars = await this.listCalendars();
      const calendarsToGetAppointmentsFrom = [];
      for (let i = 0; i < selectedCalendars.length; i++) {
        //Only select valid calendars! (We get all all active calendars on the instance! even from different users!)
        for (let k = 0; k < externalCalendars.length; k++) {
          if (selectedCalendars[i].externalId == externalCalendars[k].externalId) {
            calendarsToGetAppointmentsFrom.push(selectedCalendars[i]);
          }
        }
      }

      const finaleRet = [];
      for (let i = 0; i < calendarsToGetAppointmentsFrom.length; i++) {
        const calendarFolderId = new FolderId(calendarsToGetAppointmentsFrom[i].externalId);
        const localReturn = await this.getExchangeService()
          .FindAppointments(
            calendarFolderId,
            new CalendarView(DateTime.Parse(dateFrom), DateTime.Parse(dateTo))
          )
          .then(function (params) {
            const ret: EventBusyDate[] = [];

            for (let k = 0; k < params.Items.length; k++) {
              if (params.Items[k].LegacyFreeBusyStatus != LegacyFreeBusyStatus.Free) {
                //Dont use this appointment if "ShowAs" was set to "free"
                ret.push({
                  start: new Date(params.Items[k].Start.ToISOString()),
                  end: new Date(params.Items[k].End.ToISOString()),
                });
              }
            }
            return ret;
          });
        finaleRet.push(...localReturn);
      }

      return finaleRet;
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  async listCalendars(): Promise<IntegrationCalendar[]> {
    try {
      const allFolders: IntegrationCalendar[] = [];
      return this.getExchangeService()
        .FindFolders(WellKnownFolderName.MsgFolderRoot, new FolderView(1000))
        .then(async (res) => {
          for (const k in res.Folders) {
            const f = res.Folders[k];
            if (f.FolderClass == "IPF.Appointment") {
              //Select parent folder for all calendars
              allFolders.push({
                externalId: f.Id.UniqueId,
                name: f.DisplayName ?? "",
                primary: true, //The first one is prime
                integration: this.integrationName,
              });
              return await this.getExchangeService()
                .FindFolders(f.Id, new FolderView(1000))
                .then((res) => {
                  //Find all calendars inside calendar folder
                  res.Folders.forEach((fs) => {
                    allFolders.push({
                      externalId: fs.Id.UniqueId,
                      name: fs.DisplayName ?? "",
                      primary: false,
                      integration: this.integrationName,
                    });
                  });
                  return allFolders;
                });
            }
          }
          return allFolders;
        }) as Promise<IntegrationCalendar[]>;
    } catch (reason) {
      this.log.error(reason);
      throw reason;
    }
  }

  private getExchangeService(): ExchangeService {
    const exch1 = new ExchangeService(this.exchangeVersion);
    exch1.Credentials = new WebCredentials(this.credentials.username, this.credentials.password);
    exch1.Url = new Uri(this.url);
    return exch1;
  }
}

/**
 * Factory function that creates an Exchange 2016 Calendar service instance.
 * This is exported instead of the class to prevent SDK types (like ews-javascript-api types)
 * from leaking into the emitted .d.ts file.
 */
export default function BuildCalendarService(credential: CredentialPayload): Calendar {
  return new ExchangeCalendarService(credential);
}
