import { Request } from "express";

export interface CalendarApp {
  save(state: string, code: string, origin: string): Promise<{ url: string }>;
  check(userId: number): Promise<{ status: string }>;
}

export interface OAuthCalendarApp extends CalendarApp {
  connect(authorization: string, req: Request): Promise<{ status: string; data: { authUrl: string } }>;
}
