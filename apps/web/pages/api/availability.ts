import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";

import type { GetScheduleOptions } from "./types";

export const getAvailabilityHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};

const handleRequest = async (req: Request, res: Response) => {
  const { ctx, input } = req.body;
  const availableSlotsService = getAvailableSlotsService();
  const slots = await availableSlotsService.getAvailableSlots({ ctx, input });
  res.status(200).json(slots);
};

const fetchGuestAvailabilityConstraints = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  return await availableSlotsService.getGuestAvailabilityConstraints({ ctx, input });
};