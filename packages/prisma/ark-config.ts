import { configure } from "arktype/config";

// ArkType's can be globally configured here. Though the defaults are generally best
// practices, changing some of these options temporarily could ease migration from Zod.
// Docs: https://arktype.io/docs/configuration
configure({
  // ArkType's default is "ignore", similar to Zod's .passthrough() "ignore" is
  // much faster, but this value can be changed to "delete" to make the global
  // default like Zod's strip() to make migration easier.
  onUndeclaredKey: "ignore",
  // ArkType's default is `true`, meaning `{ foo?: string }` does not allow `{ foo: undefined }`.
  // This value can be changed to `false` to allow `undefined` as a value for all optional keys,
  // though it may be worthwhile to have stricter rules around optionality in the future.
  exactOptionalPropertyTypes: true,
});

// If you decide to use global config, this file must be imported once in your
// project before the main `arktype` entrypoint.
