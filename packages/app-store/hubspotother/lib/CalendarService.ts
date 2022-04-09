import * as hubspot from "@hubspot/api-client";
import { Credential } from "@prisma/client";

import { getLocation } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { Calendar, CalendarEvent, NewCalendarEventType } from "@calcom/types/Calendar";

import type { HubspotToken } from "../api/callback";

const hubspotClient = new hubspot.Client();

const client_id = process.env.HUBSPOT_CLIENT_ID;
const client_secret = process.env.HUBSPOT_CLIENT_SECRET;

export default class HubspotOtherService implements Calendar {
  private url = "";
  private integrationName = "";
  private log: typeof logger;

  constructor(credential: Credential) {
    this.integrationName = "hubspot_other_calendar";

    this.auth = this.hubspotAuth(credential);

    this.log = logger.getChildLogger({ prefix: [`[[lib] ${this.integrationName}`] });
  }

  private hubspotAuth = (credential: Credential) => {
    const credentialKey = credential.key as unknown as HubspotToken;
    const isTokenValid = (token: HubspotToken) =>
      token &&
      token.tokenType &&
      token.accessToken &&
      token.expiryDate &&
      (token.expiresIn || token.expiryDate) < Date.now();

    const refreshAccessToken = async (refreshToken: string) => {
      try {
        const hubspotRefreshToken: HubspotToken = await hubspotClient.oauth.tokensApi.createToken(
          "refresh_token",
          undefined,
          WEBAPP_URL + "/api/integrations/hubspotother/callback",
          client_id,
          client_secret,
          refreshToken
        );

        // set expiry date as offset from current time.
        hubspotRefreshToken.expiryDate = Math.round(Date.now() + hubspotRefreshToken.expiresIn * 1000);
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: hubspotRefreshToken as any,
          },
        });

        hubspotClient.setAccessToken(hubspotRefreshToken.accessToken);
      } catch (e: unknown) {
        log.error(e);
      }
    };

    return {
      getToken: () =>
        !isTokenValid(credentialKey)
          ? Promise.resolve(credentialKey.accessToken)
          : refreshAccessToken(credentialKey.refreshToken),
    };
  };

  async createEvent(event: CalendarEvent): Promise<NewCalendarEventType> {
    debugger;
    const contact = await hubspotContactSearch(event);
    if (contact) {
      const meetingEvent = await hubspotCreateMeeting(event);
      if (meetingEvent) {
        const associatedMeeting = await hubspotAssociate(meetingEvent, contact);
        if (associatedMeeting) {
          return Promise.resolve({
            uid: meetingEvent.id,
            id: meetingEvent.id,
            type: "hubspot_other",
            password: "",
            url: "",
            additionalInfo: { contact, associatedMeeting },
          });
        }
        return Promise.reject("Meeting and Contact couldn't be associated in HubSpot");
      }
      return Promise.reject("Meeting couldn't be created in HubSpot");
    }
    return Promise.reject("Contact not present in HubSpot");
  }

  // TODO
  async updateEvent() {
    return Promise.resolve([]);
  }

  // TODO
  async deleteEvent() {
    return Promise.resolve([]);
  }
}

const hubspotAssociate = async (meeting: any, contact: any) => {
  try {
    /**
     * {
          "properties": {
            "createdate": "2019-10-30T03:30:17.883Z",
            "hs_internal_meeting_notes": "These are the meeting notes",
            "hs_lastmodifieddate": "2019-12-07T16:50:06.678Z",
            "hs_meeting_body": "The first meeting to discuss options",
            "hs_meeting_end_time": "2021-03-23T01:52:44.872Z",
            "hs_meeting_external_url": "https://Zoom.com/0000",
            "hs_meeting_location": "Remote",
            "hs_meeting_outcome": "SCHEDULED",
            "hs_meeting_start_time": "2021-03-23T01:02:44.872Z",
            "hs_meeting_title": "Intro meeting",
            "hs_timestamp": "2019-10-30T03:30:17.883Z",
            "hubspot_owner_id": "11349275740"
          }
        }
     */
    return hubspotClient.crm.objects.meetings.associationsApi.create(
      meeting.id,
      "contact",
      contact.id,
      "meeting_event_to_contact"
    );
  } catch (e) {
    log.error(e);
  }
  return false;
};

const hubspotCreateMeeting = async (event: CalendarEvent) => {
  const objectMeeting = {
    hs_timestamp: new Date(),
    //"hubspot_owner_id": contact.properties.hubspot_owner_id,
    hs_meeting_title: event.title,
    hs_meeting_body: event.description,
    hs_internal_meeting_notes: event.additionInformation,
    hs_meeting_location: getLocation(event),
    hs_meeting_start_time: event.startTime,
    hs_meeting_end_time: event.endTime,
    hs_meeting_outcome: "SCHEDULED",
  };

  try {
    /**
     * {
          "id": "512",
          "properties": {
            "createdate": "2019-10-30T03:30:17.883Z",
            "hs_internal_meeting_notes": "These are the meeting notes",
            "hs_lastmodifieddate": "2019-12-07T16:50:06.678Z",
            "hs_meeting_body": "The first meeting to discuss options",
            "hs_meeting_end_time": "2021-03-23T01:52:44.872Z",
            "hs_meeting_external_url": "https://Zoom.com/0000",
            "hs_meeting_location": "Remote",
            "hs_meeting_outcome": "SCHEDULED",
            "hs_meeting_start_time": "2021-03-23T01:02:44.872Z",
            "hs_meeting_title": "Intro meeting",
            "hs_timestamp": "2019-10-30T03:30:17.883Z",
            "hubspot_owner_id": "11349275740"
          },
          "createdAt": "2019-10-30T03:30:17.883Z",
          "updatedAt": "2019-12-07T16:50:06.678Z",
          "archived": false
        }
     */
    return hubspotClient.crm.objects.meetings.basicApi.create(objectMeeting as any);
  } catch (e) {
    log.error(e);
  }
};

const hubspotContactSearch = async (event: CalendarEvent) => {
  const objectSearchRequest = {
    filterGroups: [
      {
        filters: [{ value: event.attendees[0].email, values: [], propertyName: "email", operator: "EQ" }],
      },
    ],
    properties: ["hs_object_id"],
    limit: 10,
    after: 0,
  };

  try {
    /**
     * {
          "total": 1,
          "results": [
            {
              "id": "401",
              "properties": {
                "createdate": "2022-04-04T22:54:24.725Z",
                "hs_object_id": "401",
                "hubspot_owner_id": "165630218",
                "lastmodifieddate": "2022-04-05T19:00:40.398Z"
              },
              "createdAt": "2022-04-04T22:54:24.725Z",
              "updatedAt": "2022-04-05T19:00:40.398Z",
              "archived": false
            }
          ]
        }
     */
    const apiResponse = await hubspotClient.crm.contacts.searchApi.doSearch(objectSearchRequest as any);
    if (apiResponse.total === 1) {
      return apiResponse.results[0];
    } else {
      log.error("More than one result for contact, aborting");
    }
  } catch (e) {
    log.error(e);
  }
  return false;
};
