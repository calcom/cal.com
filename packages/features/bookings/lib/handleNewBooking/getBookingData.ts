import type { EventTypeCustomInput } from "@prisma/client";
import type { NextApiRequest } from "next";
import type z from "zod";

import dayjs from "@calcom/dayjs";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { bookingCreateSchemaLegacyPropsForApi } from "@calcom/prisma/zod-utils";

import type { TgetBookingDataSchema } from "../getBookingDataSchema";
import { handleCustomInputs } from "./handleCustomInputs";
import type { getEventTypeResponse } from "./types";

type ReqBodyWithEnd = TgetBookingDataSchema & { end: string };

export async function getBookingData<T extends z.ZodType>({
  req,
  eventType,
  schema,
}: {
  req: NextApiRequest;
  eventType: getEventTypeResponse;
  schema: T;
}) {
  const reqBody = await schema.parseAsync(req.body);
  const reqBodyWithEnd = (reqBody: TgetBookingDataSchema): reqBody is ReqBodyWithEnd => {
    // Use the event length to auto-set the event end time.
    if (!Object.prototype.hasOwnProperty.call(reqBody, "end")) {
      reqBody.end = dayjs.utc(reqBody.start).add(eventType.length, "minutes").format();
    }
    return true;
  };
  if (!reqBodyWithEnd(reqBody)) {
    throw new Error(ErrorCode.RequestBodyWithouEnd);
  }
  // reqBody.end is no longer an optional property.
  if (reqBody.customInputs) {
    // Check if required custom inputs exist
    handleCustomInputs(eventType.customInputs as EventTypeCustomInput[], reqBody.customInputs);
    const reqBodyWithLegacyProps = bookingCreateSchemaLegacyPropsForApi.parse(reqBody);
    return {
      ...reqBody,
      name: reqBodyWithLegacyProps.name,
      email: reqBodyWithLegacyProps.email,
      guests: reqBodyWithLegacyProps.guests,
      location: reqBodyWithLegacyProps.location || "",
      smsReminderNumber: reqBodyWithLegacyProps.smsReminderNumber,
      notes: reqBodyWithLegacyProps.notes,
      rescheduleReason: reqBodyWithLegacyProps.rescheduleReason,
      // So TS doesn't complain about unknown properties
      calEventUserFieldsResponses: undefined,
      calEventResponses: undefined,
      customInputs: undefined,
    };
  }
  if (!reqBody.responses) {
    throw new Error("`responses` must not be nullish");
  }
  const responses = reqBody.responses;

  const { userFieldsResponses: calEventUserFieldsResponses, responses: calEventResponses } =
    getCalEventResponses({
      bookingFields: eventType.bookingFields,
      responses,
    });
  return {
    ...reqBody,
    name: responses.name,
    email: responses.email,
    guests: responses.guests ? responses.guests : [],
    location: responses.location?.optionValue || responses.location?.value || "",
    smsReminderNumber: responses.smsReminderNumber,
    notes: responses.notes || "",
    calEventUserFieldsResponses,
    rescheduleReason: responses.rescheduleReason,
    calEventResponses,
    // So TS doesn't complain about unknown properties
    customInputs: undefined,
  };
}

export type AwaitedBookingData = Awaited<ReturnType<typeof getBookingData>>;
export type RescheduleReason = AwaitedBookingData["rescheduleReason"];
export type NoEmail = AwaitedBookingData["noEmail"];
export type AdditionalNotes = AwaitedBookingData["notes"];
export type ReqAppsStatus = AwaitedBookingData["appsStatus"];
export type SmsReminderNumber = AwaitedBookingData["smsReminderNumber"];
export type EventTypeId = AwaitedBookingData["eventTypeId"];
export type ReqBodyMetadata = ReqBodyWithEnd["metadata"];
