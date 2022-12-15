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
  userIds: z.number().positive().optional(),
  status: z.string(),
  eventTypeIds: z.number().positive().optional(),
});

export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
  status: z.string(),
  eventTypeIds: queryNumberArray.optional(),
});

type FilterQuerySchema = z.infer<typeof filterQuerySchema>;
type Keys = keyof FilterQuerySchema;
type KeysWithoutStatus = Exclude<Keys, "status">;

export function useFilterQuery() {
  const router = useRouter();
  const data = filterQuerySchema.parse(router.query);

  const push = (key: KeysWithoutStatus, item: string | number) => {
    const newData = data;
    const search = new URLSearchParams();
    const keyData = data[key] ?? [];
    // parse item to make sure it fits the schema and then add it to the array
    const itemParsed = filterSingleSchema.shape[key].parse(item);
    if (!itemParsed) return;

    const itemWithArray = [...keyData, itemParsed] as number[];

    newData[key] = itemWithArray;

    Object.entries(newData).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });

    router.replace({ query: search.toString() }, undefined, { shallow: true });
  };

  const pop = (key: KeysWithoutStatus, item: string | number) => {
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

    router.replace({ query: search.toString() }, undefined, { shallow: true });
  };

  const set = (key: KeysWithoutStatus, item: string | number) => {
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
    router.replace({ query: search.toString() }, undefined, { shallow: true });
  };

  const clear = (schemaKey: KeysWithoutStatus) => {
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
    router.replace({ query: search.toString() }, undefined, { shallow: true });
  };

  const dataAsSearchString = () => {
    const search = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value) {
        search.append(key, value.toString());
      }
    });
    return search.toString();
  };

  return { data, push, pop, set, clear, dataAsSearchString };
}
