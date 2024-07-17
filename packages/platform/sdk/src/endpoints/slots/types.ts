import { z } from "zod";

export type SlotUID = string;

type Slot = Record<
  SlotUID,
  {
    time: string;
    attendees?: number;
    bookingUid?: string;
  }
>;

export type AvailableSlots = Slot[];

const ReserveSlotSchema = z.object({
  eventTypeId: z.number(),
  slotUtcStartDate: z.date(),
  slotUtcEndDate: z.date(),
  bookingUid: z.string().optional(),
});

const RemoveSelectedSlotSchema = z.object({
  uid: z.string().optional(),
});

const GetAvailableSlotsSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  eventTypeId: z.number().optional(),
  usernameList: z.string().array().optional(),
  debug: z.boolean().optional(),
  duration: z.number().optional(),
});

export type ReserveSlotArgs = z.infer<typeof ReserveSlotSchema>;
export type RemoveSelectedSlotArgs = z.infer<typeof RemoveSelectedSlotSchema>;
export type GetAvaialbleSlotsArgs = z.infer<typeof GetAvailableSlotsSchema>;
