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

  // push item to key of filterQuerySchema and set new query params in url

  const push = (key: Required<Keys>, item: string | number) => {
    const newData = { ...data };
    const keyData = newData[key] ?? [];
    //  @typescript-eslint/ban-ts-comment
    // @ts-ignore
    newData[key] = [...keyData, item];
    router.push({ query: newData });
  };

  const pop = (key: Required<Keys>, item: string | number) => {
    const newData = { ...data };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore idk how to fix this ?
    newData[key] = newData[key].filter((a) => a !== item);
    router.push({ query: newData });
  };

  return { data, push, pop };
}
