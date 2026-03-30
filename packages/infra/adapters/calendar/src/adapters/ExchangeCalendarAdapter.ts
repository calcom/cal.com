import type { FindFoldersResults, FindItemsResults, IXHRApi } from "ews-javascript-api";
import {
  Appointment,
  Attendee,
  BasePropertySet,
  BodyType,
  CalendarView,
  ConflictResolutionMode,
  DateTime,
  DeleteMode,
  ExchangeService,
  ExchangeVersion,
  Folder,
  FolderId,
  FolderSchema,
  FolderTraversal,
  FolderView,
  ItemId,
  LegacyFreeBusyStatus,
  LogicalOperator,
  MessageBody,
  PropertySet,
  SearchFilter,
  SendInvitationsMode,
  SendInvitationsOrCancellationsMode,
  Uri,
  WebCredentials,
  WellKnownFolderName,
} from "ews-javascript-api";

import type { CalendarAdapter } from "../CalendarAdapter";
import type {
  BusyTimeslot,
  CalendarEventInput,
  CalendarEventResult,
  CalendarInfo,
  ExchangeCalendarCredential,
  FetchBusyTimesInput,
} from "../CalendarAdapterTypes";
import { CalendarAdapterError } from "../lib/CalendarAdapterError";

const EXCHANGE_VERSION_MAP: Record<string, ExchangeVersion> = {
  Exchange2013: ExchangeVersion.Exchange2013,
  Exchange2013_SP1: ExchangeVersion.Exchange2013_SP1,
  Exchange2016: ExchangeVersion.Exchange2016,
};

const INTEGRATION_NAME = "exchange_calendar";

/**
 * ews-javascript-api's WriteValue concatenates raw strings into SOAP XML
 * without escaping. HTML void elements like <br> break the XML parser.
 * Wrapping in CDATA lets the parser skip the HTML content.
 */
function wrapInCdata(html: string): string {
  if (!html) return html;
  return `<![CDATA[${html}]]>`;
}

/**
 * Exchange calendar adapter using ews-javascript-api.
 *
 * No optional methods -- EWS push subscriptions are not used
 * by the Cal.com Exchange integration.
 */
export class ExchangeCalendarAdapter implements CalendarAdapter {
  private readonly key: ExchangeCalendarCredential["key"];

  constructor(credential: ExchangeCalendarCredential) {
    this.key = credential.key;
  }

  async createEvent(event: CalendarEventInput, _externalCalendarId?: string): Promise<CalendarEventResult> {
    const service = await this.buildService();
    const appointment = new Appointment(service);

    appointment.Subject = event.title;
    appointment.Start = DateTime.Parse(event.startTime.toISOString());
    appointment.End = DateTime.Parse(event.endTime.toISOString());
    appointment.Location = event.location ?? "";
    appointment.Body = new MessageBody(
      BodyType.HTML,
      wrapInCdata(event.calendarDescription ?? event.description ?? "")
    );

    if (event.attendees) {
      for (const attendee of event.attendees) {
        appointment.RequiredAttendees.Add(new Attendee(attendee.email));
      }
    }

    await appointment.Save(SendInvitationsMode.SendToAllAndSaveCopy);

    return {
      uid: appointment.Id.UniqueId,
      id: appointment.Id.UniqueId,
      type: INTEGRATION_NAME,
      url: "",
      additionalInfo: {},
    };
  }

  async updateEvent(
    uid: string,
    event: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<CalendarEventResult> {
    const service = await this.buildService();
    const appointment = await Appointment.Bind(service, new ItemId(uid));

    appointment.Subject = event.title;
    appointment.Start = DateTime.Parse(event.startTime.toISOString());
    appointment.End = DateTime.Parse(event.endTime.toISOString());
    appointment.Location = event.location ?? "";
    appointment.Body = new MessageBody(
      BodyType.HTML,
      wrapInCdata(event.calendarDescription ?? event.description ?? "")
    );

    if (event.attendees) {
      for (const attendee of event.attendees) {
        appointment.RequiredAttendees.Add(new Attendee(attendee.email));
      }
    }

    await appointment.Update(
      ConflictResolutionMode.AlwaysOverwrite,
      SendInvitationsOrCancellationsMode.SendToChangedAndSaveCopy
    );

    return {
      uid: appointment.Id.UniqueId,
      id: appointment.Id.UniqueId,
      type: INTEGRATION_NAME,
      url: "",
      additionalInfo: {},
    };
  }

  async deleteEvent(
    uid: string,
    _event?: CalendarEventInput,
    _externalCalendarId?: string | null
  ): Promise<void> {
    const service = await this.buildService();
    const appointment = await Appointment.Bind(service, new ItemId(uid));
    await appointment.Delete(DeleteMode.MoveToDeletedItems);
  }

  async fetchBusyTimes(params: FetchBusyTimesInput): Promise<BusyTimeslot[]> {
    const { dateFrom, dateTo, calendars } = params;
    const allCalendars = await this.listCalendars();

    const selected = allCalendars.filter((local) =>
      calendars.some((ref) => local.externalId === ref.externalId)
    );

    const service = await this.buildService();
    const results: BusyTimeslot[] = [];

    for (const calendar of selected) {
      const view = new CalendarView(DateTime.Parse(dateFrom), DateTime.Parse(dateTo));
      const found: FindItemsResults<Appointment> = await service.FindAppointments(
        new FolderId(calendar.externalId),
        view
      );

      for (const appointment of found.Items) {
        if (appointment.LegacyFreeBusyStatus === LegacyFreeBusyStatus.Free) {
          continue;
        }
        results.push({
          start: new Date(appointment.Start.ToISOString()),
          end: new Date(appointment.End.ToISOString()),
        });
      }
    }

    return results;
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const service = await this.buildService();

    const view = new FolderView(1000);
    view.PropertySet = new PropertySet(BasePropertySet.IdOnly);
    view.PropertySet.Add(FolderSchema.ParentFolderId);
    view.PropertySet.Add(FolderSchema.DisplayName);
    view.PropertySet.Add(FolderSchema.ChildFolderCount);
    view.Traversal = FolderTraversal.Deep;

    const deletedItems = await Folder.Bind(service, WellKnownFolderName.DeletedItems);

    const searchFilters = new SearchFilter.SearchFilterCollection(LogicalOperator.And);
    searchFilters.Add(new SearchFilter.IsEqualTo(FolderSchema.FolderClass, "IPF.Appointment"));

    const found: FindFoldersResults = await service.FindFolders(
      WellKnownFolderName.MsgFolderRoot,
      searchFilters,
      view
    );

    return found.Folders.filter(
      (folder: Folder) => folder.ParentFolderId.UniqueId !== deletedItems.Id.UniqueId
    ).map((folder: Folder) => ({
      externalId: folder.Id.UniqueId,
      name: folder.DisplayName ?? "",
      integration: INTEGRATION_NAME,
      primary: folder.ChildFolderCount > 0,
    }));
  }

  private async buildService(): Promise<ExchangeService> {
    const version = EXCHANGE_VERSION_MAP[this.key.exchangeVersion];
    if (!version) {
      throw new CalendarAdapterError({
        provider: "Exchange",
        message: `Unsupported Exchange version: ${this.key.exchangeVersion}. Supported: ${Object.keys(EXCHANGE_VERSION_MAP).join(", ")}`,
        status: 400,
        transient: false,
      });
    }

    const service = new ExchangeService(version);
    service.Credentials = new WebCredentials(this.key.username, this.key.password);
    service.Url = new Uri(this.key.url);

    if (this.key.authenticationMethod === "NTLM") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { XhrApi } = require("@ewsjs/xhr") as Record<string, unknown>;
      const XhrApiCtor = XhrApi as new (opts: Record<string, unknown>) => { useNtlmAuthentication: (u: string, p: string) => IXHRApi };
      service.XHRApi = new XhrApiCtor({
        rejectUnauthorized: this.key.allowSelfSignedCerts !== true,
      }).useNtlmAuthentication(this.key.username, this.key.password);
    }

    return service;
  }
}
