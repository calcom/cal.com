import { SelectedCalendar } from "@prisma/client";
import { Request } from "express";

import { ApiResponse } from "@calcom/platform-types";

export interface CalendarApp {
  save(state: string, code: string, origin: string): Promise<{ url: string }>;
  check(userId: number): Promise<ApiResponse>;
}

export interface CredentialSyncCalendarApp {
  save(userId: number, userEmail: string, username: string, password: string): Promise<{ status: string }>;
  check(userId: number): Promise<ApiResponse>;
}

export interface OAuthCalendarApp extends CalendarApp {
  connect(authorization: string, req: Request): Promise<ApiResponse<{ authUrl: string }>>;
}

/** Makes selected props from a record non optional  */
export type Ensure<T, K extends keyof T> = Omit<T, K> & {
  [EK in K]-?: NonNullable<T[EK]>;
};

export interface IntegrationCalendar extends Ensure<Partial<SelectedCalendar>, "externalId"> {
  primary?: boolean;
  name?: string;
  readOnly?: boolean;
  // For displaying the connected email address
  email?: string;
  primaryEmail?: string;
  credentialId?: number | null;
  integrationTitle?: string;
}
