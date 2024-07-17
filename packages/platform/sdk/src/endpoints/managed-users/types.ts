import { z } from "zod";

export type User = {
  id: number;
  email: string;
  username: string;
};

const CreateUserSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  timeFormat: z.number().optional(),
  isWeekStart: z.string().optional(),
  timeZone: z.string().optional(),
});

export type CreateUserArgs = z.infer<typeof CreateUserSchema>;

export type CreateUserResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
