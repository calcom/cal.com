import type { ElementOf } from "ts-essentials";
import { z } from "zod";

const CreateScheduleSchema = z.object({
  name: z.string(),
  timeZone: z.string(),
  isDefault: z.boolean().default(true),
  availabilities: z
    .object({
      days: z.number().array(),
      startTime: z.string(),
      endTime: z.string(),
    })
    .array(),
  forAtom: z.boolean().optional(),
});

const GetScheduleByIdSchema = z.object({
  id: z.number(),
  forAtom: z.boolean().optional(),
});

const UpdateScheduleSchema = z.object({
  timeZone: z.string().optional(),
  name: z.string().optional(),
  isDefault: z.boolean().optional(),
  schedule: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .array()
    .optional(),
  dateOverrides: z.object({
    ranges: z.object({}),
  }),
});

export type CreateScheduleArgs = z.infer<typeof CreateScheduleSchema>;
export type GetScheduleByIdArgs = z.infer<typeof GetScheduleByIdSchema>;
export type UpdateScheduleArgs = z.infer<typeof UpdateScheduleSchema>;

export type Schedule = CreateScheduleArgs & {
  id: number;
  userId: number;
};

export type FormattedSchedule = {
  id: number;
  name: string;
  isManaged: boolean;
  schedule: ElementOf<Schedule["availabilities"]>;
  timeZone: string;
  isDefault: boolean;
  isLastSchedule: boolean;
  readOnly: boolean;
};

export type SupportedTimezone = {
  city: string;
  timezone: string;
  pop: number;
};
