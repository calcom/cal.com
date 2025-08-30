export class IcsCalendarServiceMock {
  async listCalendars() {
    return [
      {
        name: "name",
        readOnly: true,
        externalId: "externalId",
        integrationName: "ics-feed_calendar",
        primary: true,
        email: "email",
        primaryEmail: "primaryEmail",
        credentialId: 1,
        integrationTitle: "integrationTitle",
      },
    ] satisfies {
      primary?: boolean;
      name?: string;
      readOnly?: boolean;
      email?: string;
      primaryEmail?: string;
      credentialId?: number | null;
      integrationTitle?: string;
      externalId?: string;
      integrationName?: string;
    }[];
  }
}
