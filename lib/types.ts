import { User, ApiKey, Team, SelectedCalendar } from "@calcom/prisma/client";

// Base response, used for all responses
export type BaseResponse = {
  message?: string;
  error?: Error;
};
// User
export type UserResponse = BaseResponse & {
  data?: Partial<User>;
};
export type UsersResponse = BaseResponse & {
  data?: Partial<User>[];
};

// API Key
export type ApiKeyResponse = BaseResponse & {
  data?: Partial<ApiKey>;
};
export type ApiKeysResponse = BaseResponse & {
  data?: Partial<ApiKey>[];
};

// API Key
export type TeamResponse = BaseResponse & {
  data?: Partial<Team>;
};
export type TeamsResponse = BaseResponse & {
  data?: Partial<Team>[];
};

// API Key
export type SelectedCalendarResponse = BaseResponse & {
  data?: Partial<SelectedCalendar>;
};
export type SelectedCalendarsResponse = BaseResponse & {
  data?: Partial<SelectedCalendar>[];
};
