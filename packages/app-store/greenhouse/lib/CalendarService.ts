import { baseApiUrl } from "greenhouse/api/callback";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Credential } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

/** @link https://developers.greenhouse.io/harvest.html#get-retrieve-user */
export const greenhouseUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
  employee_id: z.number(),
});

/** @link https://developers.greenhouse.io/harvest.html#the-scheduled-interview-object  */
export const greenhouseInterviewSchema = z.object({
  id: z.number().optional(),
  start: z.object({
    date_time: z.string(),
  }),
  end: z.object({
    date_time: z.string(),
  }),
  location: z.string().optional(), //check if optional
  video_conferencing_url: z.string(),
  status: z.enum(["scheduled", "awaiting_feedback", "complete"]),
  organizer: greenhouseUserSchema,
  interviewers: z.array(greenhouseUserSchema),
});

export const greenhouseInterviewsSchema = z.array(greenhouseInterviewSchema);
const GreenhouseCalendarService = (credential: CredentialPayload) => {
  const translateEvent = (event: CalendarEvent) => {
    /**
     * To convert the Cal's CalendarEvent type to a Greenhouse scheduled interview type
     * @link https://developers.greenhouse.io/harvest.html#the-scheduled-interview-object
     */

    return {
      title: event.title,
      start: dayjs(event.startTime).utc().format(),
      end: dayjs(event.endTime).utc().format(),
      location: event.location,
      organizer: event.organizer,
      interviewers: event.attendees.map((attendee) => ({
        email: attendee.email,
      })),
      sendEmail: true,
    };
  };

  const fetchGreenhouseApi = async (endpoint: string, options?: RequestInit) => {
    const { api_key, user_id } = await getAppKeysFromSlug("greenhouse");

    /** Note: the full url is passed as endpoint since some urls use Greenhouse API v1 and some use v2. See note in the `/api/callback file` */
    const response = await fetch(`${endpoint}`, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Basic ${api_key}`,
        "On-Behalf-Of": `${user_id}`,
        ...options?.headers,
      },
    });
    const responseBody = await handleGreenhouseResponse(response, credential.id);
    return responseBody;
  };

  return {
    getInterviews: async () => {
      try {
        const responseBody = await fetchGreenhouseApi(`${baseApiUrl}/scheduled_interviews`);
        const data = greenhouseInterviewsSchema.parse(responseBody);

        return data.map((interview) => ({
          start: interview.start,
          end: interview.end,
        }));
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    createInterview: async (event: CalendarEvent) => {
      /** Uses the v2 endpoint
       * @link https://developers.greenhouse.io/harvest.html#post-create-scheduled-interview
       */
      try {
        const response = await fetchGreenhouseApi("https://harvest.greenhouse.io/v2/scheduled_interviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        });
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com webex app"));
          }
        }

        const data = greenhouseInterviewSchema.parse(response);

        if (data.id && data.location) {
          return {
            type: "greenhouse_other",
            id: data.id.toString(),
            url: data.location,
          };
        }
        throw new Error(`Failed to create scheduled interview. Response is ${JSON.stringify(data)}`);
      } catch (err) {
        console.error(err);
        return [];
      }
    },

    deleteInterview: async (uid: string): Promise<void> => {
      try {
        const response = await fetchGreenhouseApi(`${baseApiUrl}/scheduled_interviews/${uid}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com webex app"));
          }
        }

        if (response.ok) {
          return;
        } else {
          throw new Error(`Failed to delete scheduled interview for uid ${uid}`);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    },
    updateInterview: async (uid: string, event: CalendarEvent, externalCalendarId: string) => {
      try {
        const response = await fetchGreenhouseApi(
          `https://harvest.greenhouse.io/v2/scheduled_interviews/${uid}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (response.error) {
          if (response.error === "invalid_grant") {
            await invalidateCredential(credential.id);
            return Promise.reject(new Error("Invalid grant for Cal.com webex app"));
          }
        }
        if (response.ok) {
          return;
        } else {
          throw new Error(`Failed to update scheduled interview for uid ${uid}`);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    },
  };
};
const handleGreenhouseResponse = async (response: Response, credentialId: Credential["id"]) => {
  let _response = response.clone();
  const responseClone = response.clone();
  if (_response.headers.get("content-encoding") === "gzip") {
    const responseString = await response.text();
    _response = JSON.parse(responseString);
  }
  if (!response.ok || (response.status < 200 && response.status >= 300)) {
    const responseBody = await _response.json();

    if ((response && response.status === 124) || responseBody.error === "invalid_grant") {
      await invalidateCredential(credentialId);
    }
    throw Error(response.statusText);
  }
  // handle 204 response code with empty response (causes crash otherwise as "" is invalid JSON)
  if (response.status === 204) {
    return;
  }
  return responseClone.json();
};

const invalidateCredential = async (credentialId: Credential["id"]) => {
  const credential = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
  });

  if (credential) {
    await prisma.credential.update({
      where: {
        id: credentialId,
      },
      data: {
        invalid: true,
      },
    });
  }
};

export default GreenhouseCalendarService;
/**
 * TODOS
 * fetch list of interviews
 * get a specific scheduled interview
 * update a scheduled interview
 * delete a schedule interview
 * webhook - there's only one webhook available for scheduled interview - triggered when an interview is deleted
 */
