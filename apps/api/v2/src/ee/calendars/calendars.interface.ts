import { CreateIcsFeedOutputResponseDto } from "@/ee/calendars/input/create-ics.output";
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

export interface ICSFeedCalendarApp {
  save(
    userId: number,
    userEmail: string,
    urls: string[],
    readonly?: boolean
  ): Promise<CreateIcsFeedOutputResponseDto>;
  check(userId: number): Promise<ApiResponse>;
}

export interface OAuthCalendarApp extends CalendarApp {
  connect(authorization: string, req: Request): Promise<ApiResponse<{ authUrl: string }>>;
}
