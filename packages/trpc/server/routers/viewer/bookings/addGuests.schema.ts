import { z } from "zod";

type TGuestSchema = {
  email: string;
  name?: string;
  timeZone?: string;
  phoneNumber?: string;
  language?: string;
};

const ZGuestSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  timeZone: z.string().optional(),
  phoneNumber: z.string().optional(),
  language: z.string().optional(),
});

export type TAddGuestsInputSchema = {
  bookingId: number;
  guests: TGuestSchema[];
};

export const ZAddGuestsInputSchema = z.object({
  bookingId: z.number(),
  guests: z.array(ZGuestSchema),
});
