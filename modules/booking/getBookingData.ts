import z from "zod";
import {
  bookingCreateSchemaLegacyPropsForApi,
  userMetadata as userMetadataSchema,
} from "@calcom/prisma/zod-utils";
import { getEventTypesFromDB } from "../eventTypes/getEventTypesFromDB";
import type { NextApiRequest } from "next";
import getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { handleCustomInputs } from "../customInputs/handleCustomInputs";
import dayjs from "@calcom/dayjs";
import { EventTypeCustomInput } from "@calcom/prisma/client";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";

// Work with Typescript to require reqBody.end
type ReqBodyWithoutEnd = z.infer<ReturnType<typeof getBookingDataSchema>>;
type ReqBodyWithEnd = ReqBodyWithoutEnd & { end: string };


export async function getBookingData({
  req,
  isNotAnApiCall,
  eventType,
}: {
  req: NextApiRequest;
  isNotAnApiCall: boolean;
  eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
}) {
  const bookingDataSchema = getBookingDataSchema(req.body?.rescheduleUid, isNotAnApiCall, eventType);

  const reqBody = await bookingDataSchema.parseAsync(req.body);

  const reqBodyWithEnd = (reqBody: ReqBodyWithoutEnd): reqBody is ReqBodyWithEnd => {
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
  if ("customInputs" in reqBody) {
    if (reqBody.customInputs) {
      // Check if required custom inputs exist
      handleCustomInputs(eventType.customInputs as EventTypeCustomInput[], reqBody.customInputs);
    }
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
    };
  } else {
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
    };
  }
}