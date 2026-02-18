import User from "@prisma/client";
import { getUserByEmail } from "@calcom/features/users/lib/getUserByEmail";

import _ from "lodash";
import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";

import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  const attendeeEmail = input.attendee.email; // Assuming the email is part of the input
  const user = await getUserByEmail(attendeeEmail);
  if (user && user.type === "USER") {
    return await availableSlotsService.getAvailableSlots({ ctx, input });
  } else {
    throw new Error("Attendee is not a Cal.com user");
  }
};
