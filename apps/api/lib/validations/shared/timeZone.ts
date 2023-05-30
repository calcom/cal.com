import tzdata from "tzdata";
import * as z from "zod";

// @note: This is a custom validation that checks if the timezone is valid and exists in the tzdb library
export const timeZone = z.string().refine((tz: string) => Object.keys(tzdata.zones).includes(tz), {
  message: `Expected one of the following: ${Object.keys(tzdata.zones).join(", ")}`,
});
