import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { z } from "zod";

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

export function useTypedQuery<T extends z.Schema>(schema: T) {
  type InferedSchema = z.infer<typeof schema>;
  type SchemaKeys = keyof InferedSchema;
  type OptionalKeys = {
    [K in keyof InferedSchema]: undefined extends InferedSchema[K] ? K : never;
  }[keyof InferedSchema];

  type ArrayOnlyKeys = {
    [K in keyof InferedSchema]: InferedSchema[K] extends Array<unknown> & undefined ? K : never;
  };

  const { query: unparsedQuery, ...router } = useRouter();
  const parsedQuerySchema = schema.safeParse(unparsedQuery);

  let parsedQuery: InferedSchema = useMemo(() => {
    return {} as InferedSchema;
  }, []);

  if (parsedQuerySchema.success) parsedQuery = parsedQuerySchema.data;
  else if (!parsedQuerySchema.success) console.error(parsedQuerySchema.error);

  // Set the query based on schema values
  const setQuery = useCallback(
    function setQuery<J extends SchemaKeys>(key: J, value: Partial<InferedSchema[J]>) {
      // Remove old value by key so we can merge new value
      const { [key]: _, ...newQuery } = parsedQuery;
      const newValue = { ...newQuery, [key]: value };
      const search = new URLSearchParams(newValue).toString();
      router.replace({ query: search }, undefined, { shallow: true });
    },
    [parsedQuery, router]
  );

  // Delete a key from the query
  function removeByKey(key: OptionalKeys) {
    const { [key]: _, ...newQuery } = parsedQuery;
    router.replace({ query: newQuery }, undefined, { shallow: true });
  }

  // push item to existing key
  function pushItemToKey<J extends SchemaKeys>(
    key: J,
    value: InferedSchema[J] extends Array<unknown> | undefined
      ? NonNullable<InferedSchema[J]>[number]
      : NonNullable<InferedSchema[J]>
  ) {
    const existingValue = parsedQuery[key];
    if (Array.isArray(existingValue)) {
      if (existingValue.includes(value)) return; // prevent adding the same value to the array
      setQuery(key, [...existingValue, value]);
    } else {
      setQuery(key, [value]);
    }
  }

  // Remove item by key and value
  function removeItemByKeyAndValue<J extends SchemaKeys>(
    key: J,
    value: InferedSchema[J] extends Array<unknown> | undefined
      ? NonNullable<InferedSchema[J]>[number]
      : NonNullable<InferedSchema[J]>
  ) {
    const existingValue = parsedQuery[key];
    console.log(existingValue);
    const newValue = existingValue.filter((item: InferedSchema[J][number]) => item !== value);
    if (Array.isArray(existingValue) && newValue.length > 0) {
      setQuery(key, value);
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - we know the key is optional but i can't figure out for the life of me
      // how to support it in the type
      removeByKey(key);
    }
  }

  return { data: parsedQuery, setQuery, removeByKey, pushItemToKey, removeItemByKeyAndValue };
}
