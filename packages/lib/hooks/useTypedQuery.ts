import { useRouter } from "next/router";
import { useCallback, useRef } from "react";
import { z } from "zod";

type OptionalKeys<T> = { [K in keyof T]-?: Record<string, unknown> extends Pick<T, K> ? K : never }[keyof T];

type FilteredKeys<T, U> = { [K in keyof T as T[K] extends U ? K : never]: T[K] };

// Take array as a string and return zod array
export const queryNumberArray = z
  .string()
  .or(z.number())
  .or(z.array(z.number()))
  .transform((a) => {
    if (typeof a === "string") return a.split(",").map((a) => Number(a));
    if (Array.isArray(a)) return a;
    return [a];
  });

// Take array as a string and return zod  number array

// Take string and return return zod string array - comma separated
export const queryStringArray = z
  .preprocess((a) => z.string().parse(a).split(","), z.string().array())
  .or(z.string().array());

export function useTypedQuery<T extends z.AnyZodObject>(schema: T) {
  type Output = z.infer<typeof schema>;
  type FullOutput = Required<Output>;
  type OutputKeys = Required<keyof FullOutput>;
  type OutputOptionalKeys = OptionalKeys<Output>;
  type ArrayOutput = FilteredKeys<FullOutput, Array<unknown>>;
  type ArrayOutputKeys = keyof ArrayOutput;

  const { query: unparsedQuery, ...router } = useRouter();
  const parsedQuerySchema = schema.safeParse(unparsedQuery);

  const parsedQuery = useRef({} as Output);

  if (parsedQuerySchema.success) parsedQuery.current = parsedQuerySchema.data;
  else if (!parsedQuerySchema.success) console.error(parsedQuerySchema.error);

  // Set the query based on schema values
  const setQuery = useCallback(
    function setQuery<J extends OutputKeys>(key: J, value: Output[J]) {
      // Remove old value by key so we can merge new value
      const { [key]: _, ...newQuery } = parsedQuery.current;
      parsedQuery.current = { ...newQuery, [key]: value };
      const search = new URLSearchParams(parsedQuery.current).toString();

      router.replace({ query: search }, undefined, { shallow: true });
    },
    [router]
  );

  // Delete a key from the query
  function removeByKey(key: OutputOptionalKeys) {
    const { [key]: _, ...newQuery } = parsedQuery.current;
    parsedQuery.current = newQuery;
    router.replace({ query: newQuery as Output }, undefined, { shallow: true });
  }

  // push item to existing key
  function pushItemToKey<J extends ArrayOutputKeys>(key: J, value: ArrayOutput[J][number]) {
    const existingValue = parsedQuery.current[key];
    if (Array.isArray(existingValue)) {
      if (existingValue.includes(value)) return; // prevent adding the same value to the array
      // @ts-expect-error this is too much for TS it seems
      setQuery(key, [...existingValue, value]);
    } else {
      // @ts-expect-error this is too much for TS it seems
      setQuery(key, [value]);
    }
  }

  // Remove item by key and value
  function removeItemByKeyAndValue<J extends ArrayOutputKeys>(key: J, value: ArrayOutput[J][number]) {
    const existingValue = parsedQuery.current[key];
    if (Array.isArray(existingValue) && existingValue.length > 1) {
      // @ts-expect-error this is too much for TS it seems
      const newValue = existingValue.filter((item) => item !== value);
      setQuery(key, newValue);
    } else {
      // @ts-expect-error this is too much for TS it seems
      removeByKey(key);
    }
  }

  return { data: parsedQuery.current, setQuery, removeByKey, pushItemToKey, removeItemByKeyAndValue };
}
