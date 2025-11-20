import { createParser } from "nuqs";

export const viewParser = createParser({
  parse: (value: string) => {
    if (value === "calendar") return "calendar";
    return "list";
  },
  serialize: (value: "list" | "calendar") => value,
});

export type BookingView = "list" | "calendar";
