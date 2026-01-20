import type { TFunction } from "i18next";

export interface IBookingRedirect {
  language: TFunction;
  fromEmail: string;
  eventOwner: string;
  toEmail: string;
  toName: string;
  oldDates?: string;
  dates: string;
  action: "add" | "update" | "cancel";
}
