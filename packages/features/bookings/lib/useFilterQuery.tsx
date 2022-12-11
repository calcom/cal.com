import { useRouter } from "next/router";
import z from "zod";

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

const filterSingleSchema = z.object({
  teamIds: z.number().positive().optional(),
  status: z.string().optional(), // Not used right now but could be implemented when/if we move status to a filter
  userIds: z.number().positive().optional(),
  eventTypeIds: z.number().positive().optional(),
});

const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  status: queryStringArray.optional(), // Not used right now but could be implemented when/if we move status to a filter
  userIds: queryNumberArray.optional(),
  eventTypeIds: queryNumberArray.optional(),
});

type FilterQuerySchema = z.infer<typeof filterQuerySchema>;
type Keys = keyof FilterQuerySchema;

export function useFilterQuery() {
  const router = useRouter();
  const data = filterQuerySchema.parse(router.query);

  const push = (key: Required<Keys>, item: string | number) => {
    const newData = data;
    const search = new URLSearchParams();
    const keyData = data[key] ?? ([] as number[] | string[]);
    // parse item to make sure it fits the schema and then add it to the array
    const itemParsed = filterSingleSchema.shape[key].parse(item);
    if (!itemParsed) return;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore I have no idea how to type this?
    newData[key] = [...keyData, itemParsed];

    Object.entries(newData).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });

    router.push({ query: search.toString() }, undefined, { shallow: true });
  };

  const pop = (key: Required<Keys>, item: string | number) => {
    return;
  };

  return { data, push, pop };
}
