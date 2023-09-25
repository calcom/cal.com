import { z } from "zod";

/** @link https://developers.greenhouse.io/harvest.html#the-scheduled-interview-object */
export const greenhouseUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
  employee_id: z.number(),
});

export const greenhouseInterviewerSchema = z.object({
  id: z.number(),
  employee_id: z.string(),
  name: z.string(),
  email: z.string().email(),
  response_status: z.enum(["needs_action", "declined", "tentative", "accepted"]),
  scorecard_id: z.number(),
});
export const greenhouseInterviewSchema = z.object({
  id: z.number(),
  start: z.object({
    date_time: z.string(),
  }),
  end: z.object({
    date_time: z.string(),
  }),
  location: z.string().optional(), //check if optional
  video_conferencing_url: z.string(),
  status: z.enum(["scheduled", "awaiting_feedback", "complete"]),
  created_at: z.date(),
  updated_at: z.date(),
  organizer: greenhouseUserSchema,
  interviewers: z.array(greenhouseInterviewerSchema),
});
