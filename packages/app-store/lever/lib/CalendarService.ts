import { baseApiUrl } from "lever/api/callback";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Credential } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

/** @link https://hire.lever.co/developer/documentation#retrieve-a-single-user*/
export const leverUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().regex(/^[^@]+/),
  email: z.string().email(),
});

/** @link https://hire.lever.co/developer/documentation#interviews */

export const leverInterviewSchema = z.object({
  id: z.string().uuid(),
  panel: z.string().uuid(),
  subject: z.string().optional(),
  note: z.string().optional(),
  interviewers: z.array(leverUserSchema),
  date: z.string().datetime(),
  duration: z.number(),
  location: z.string().optional(),
  /** stage: z.nativeEnum(Stage_data), Todo write the stage zod enum from,
   * @link https://hire.lever.co/developer/documentation#list-all-stages */
  user: leverUserSchema.shape.id,
});

export const leverInterviewsSchema = z.array(leverInterviewSchema);
const LeverCalendarService = (credential: CredentialPayload) => {
  const translateEvent = (event: CalendarEvent) => {
    /**
     * To convert the Cal's CalendarEvent type to a lever scheduled interview type
     * @link https://hire.lever.co/developer/documentation#interviews
     */

    return {
      title: event.title,
      date: dayjs(event.startTime).utc().format(),
      location: event.location,
      user: event.organizer,
      interviewers: event.attendees.map((attendee) => ({
        email: attendee.email,
      })),
      sendEmail: true,
    };
  };

  const fetchLeverApi = async (endpoint: string, options?: RequestInit) => {
    const { api_key, user_id } = await getAppKeysFromSlug("lever");

    const response = await fetch(`${endpoint}`, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Bearer ${api_key}`,
        perform_as: `${user_id}`,
        ...options?.headers,
      },
    });
    const responseBody = await handleLeverResponse(response, credential.id);
    return responseBody;
  };

  return {
    getInterviews: async () => {
      try {
        const responseBody = await fetchLeverApi(`${baseApiUrl}/opportunities/interviews`);
        const data = leverInterviewsSchema.parse(responseBody);

        return data.map((interview) => ({
          date: interview.date,
        }));
      } catch (err) {
        console.error(err);
        return [];
      }
    },
    createInterview: async (event: CalendarEvent) => {
      /** @link https://hire.lever.co/developer/documentation#create-an-interview */
      try {
        const response = await fetchLeverApi("https://api.lever.co/v1/opportunities/interviews", {
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

        const data = leverInterviewSchema.parse(response);

        if (data.id && data.location) {
          return {
            type: "lever_other",
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
        const response = await fetchLeverApi(`${baseApiUrl}/opportunities/interviews/${uid}`, {
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
        const response = await fetchLeverApi(`https://api.lever.co/v1/opportunities/interviews/${uid}`, {
          method: "PUT",
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
          throw new Error(`Failed to update scheduled interview for uid ${uid}`);
        }
      } catch (err) {
        console.error(err);
        return;
      }
    },
  };
};
const handleLeverResponse = async (response: Response, credentialId: Credential["id"]) => {
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
  //check this
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

export default LeverCalendarService;
