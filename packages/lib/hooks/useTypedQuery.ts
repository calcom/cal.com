import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { z } from "zod";

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

  if (parsedQuerySchema.success) {
    parsedQuery = parsedQuerySchema.data;
  }

  // Set the query based on schema values
  const setQuery = useCallback(
    function setQuery<J extends SchemaKeys>(key: J, value: Partial<InferedSchema[J]>) {
      router.replace({ query: { ...parsedQuery, [key]: value } }, undefined, { shallow: true });
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
    if (Array.isArray(existingValue)) {
      setQuery(
        key,
        existingValue.filter((item: InferedSchema[J][0]) => item !== value)
      );
    }
  }

  return { data: parsedQuery, setQuery, removeByKey, pushItemToKey, removeItemByKeyAndValue };
}
