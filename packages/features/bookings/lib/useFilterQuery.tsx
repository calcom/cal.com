import { useRouter } from "next/router";
import z from "zod";

import { useTypedQuery } from "./useTypedQuery";

// Take string and return number
export const queryNumberSchema = z.preprocess(
  (a) => parseInt(z.string().parse(a), 10),
  z.number().positive().array()
);
// Take array as a string and return zod array
export const queryNumberArray = z.preprocess(
  (a) =>
    z
      .string()
      .parse(a)
      .split(",")
      .map((a) => parseInt(a, 10)),
  z.number().positive().array()
);
// Take string and return return zod string array - comma separated
export const queryStringArray = z.preprocess((a) => z.string().parse(a).split(","), z.string().array());

export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
  status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]),
  eventTypeIds: queryNumberArray.optional(),
});

type FilterQuerySchema = z.infer<typeof filterQuerySchema>;
type Keys = keyof FilterQuerySchema;
type KeysWithoutStatus = Exclude<Keys, "status">;

export function useFilterQuery() {
  return useTypedQuery(filterQuerySchema);
}
