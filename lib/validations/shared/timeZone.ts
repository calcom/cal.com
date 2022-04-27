import * as tzdb from "tzdata";
import * as z from "zod";

// @note: This is a custom validation that checks if the timezone is valid and exists in the tzdb library
export const timeZone = z.string().refine((tz: string) => Object.keys(tzdb.zones).includes(tz));
