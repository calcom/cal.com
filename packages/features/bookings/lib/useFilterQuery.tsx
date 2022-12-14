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
    const keyData = data[key] ?? [];
    // parse item to make sure it fits the schema and then add it to the array
    const itemParsed = filterSingleSchema.shape[key].parse(item);
    if (!itemParsed) return;

    const itemWithArray = [...keyData, itemParsed] as string[] & number[];

    newData[key] = itemWithArray;

    Object.entries(newData).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });

    router.push({ query: search.toString() }, undefined, { shallow: true });
  };

  const pop = (key: Required<Keys>, item: string | number) => {
    // Pop item from array
    const newData = data;
    const search = new URLSearchParams();
    const keyData = (data[key] as string[] & number[]) ?? [];
    const itemParsed = filterSingleSchema.shape[key].parse(item);
    if (!itemParsed) return;

    const itemWithArray = keyData.filter((a: string | number) => a !== itemParsed) as string[] & number[];

    newData[key] = itemWithArray;

    Object.entries(newData).forEach(([key, value]) => {
      if (value.length > 0) {
        search.append(key, value.toString());
      }
    });
    router.push({ query: search.toString() }, undefined, { shallow: true });
  };

  const set = (key: Required<Keys>, item: string | number) => {
    // Set item to array
    const newData = data;
    const search = new URLSearchParams();
    const itemParsed = filterSingleSchema.shape[key].parse(item);
    if (!itemParsed) return;

    newData[key] = [itemParsed] as string[] & number[];

    Object.entries(newData).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });
    router.push({ query: search.toString() }, undefined, { shallow: true });
  };

  const clear = (schemaKey: Required<Keys>) => {
    // Clear item from array
    const newData = data;
    const search = new URLSearchParams();
    newData[schemaKey] = [];

    Object.entries(newData).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });
    search.delete(schemaKey);
    router.push({ query: search.toString() }, undefined, { shallow: true });
  };

  return { data, push, pop, set, clear };
}
