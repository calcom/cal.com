import { createZodDto } from "nestjs-zod";
import { z } from "nestjs-zod/z";

export const CreateBookingSchema = z.object({
  name: z.string(),
  email: z.string(),
  timezone: z.string(),
});

export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}
