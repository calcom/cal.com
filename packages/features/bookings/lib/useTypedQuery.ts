import { useRouter } from "next/router";
import { z } from "zod";

export function useTypedQuery<T extends z.Schema>(schema: T) {
  type InferedSchema = z.infer<typeof schema>;
  type SchemaKeys = keyof InferedSchema;
  const { query: unparsedQuery, ...router } = useRouter();
  const parsedQuery = schema.parse(unparsedQuery) as InferedSchema;

  // Set the query based on schema values
  function setQuery<J extends SchemaKeys>(key: J, value: InferedSchema[J]) {
    router.replace({ query: { ...parsedQuery, [key]: value } }, undefined, { shallow: true });
  }

  // Delete a key from the query
  function removeByKey(key: SchemaKeys) {
    const { [key]: _, ...newQuery } = parsedQuery;
    router.replace({ query: newQuery }, undefined, { shallow: true });
  }

  // push item to existing key
  function pushItemToKey<J extends SchemaKeys>(
    key: J,
    value: InferedSchema[J] extends Array<unknown> ? InferedSchema[J][0] : InferedSchema[J] // If the value is an array, use the first item of the array as the type for the value
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
    value: InferedSchema[J] extends Array<unknown> ? InferedSchema[J][0] : InferedSchema[J]
  ) {
    const existingValue = parsedQuery[key];
    if (Array.isArray(existingValue)) {
      setQuery(
        key,
        existingValue.filter((item: InferedSchema[J][0]) => item !== value)
      );
    } else {
      setQuery(key, undefined);
    }
  }

  return { data: parsedQuery, setQuery, removeByKey, pushItemToKey, removeItemByKeyAndValue };
}

const testSchema = z.object({
  test: z.string(),
  test2: z.string(),
  test3: z.number().array(),
});

function Test() {
  const { data, setQuery, removeByKey, pushItemToKey, removeItemByKeyAndValue } = useTypedQuery(testSchema);
  setQuery("test2", "test");
  removeByKey("test2");
  removeItemByKeyAndValue("test", "2");
}
