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

export type CreateScheduleArgs = z.infer<typeof CreateScheduleSchema>;
export type Schedule = CreateScheduleArgs & {
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
