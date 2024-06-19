import { Request } from "express";

import { ApiResponse } from "@calcom/platform-types";

export interface CalendarApp {
  save(
    state: string,
    code: string,
    origin: string,
    username?: string,
    password?: string
  ): Promise<{ url: string } | { status: string }>;
  check(userId: number): Promise<ApiResponse>;
}

export interface OAuthCalendarApp extends CalendarApp {
  connect(authorization: string, req: Request): Promise<ApiResponse<{ authUrl: string }>>;
}
