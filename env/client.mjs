// @ts-check
import validationFailure from "./_validationFailure.mjs";
import { clientEnv, clientSchema, appStoreClientSchema } from "./schema.mjs";

const parsedClientEnv = clientSchema.safeParse(clientEnv);
const parseAppStoreClientEnv = appStoreClientSchema.safeParse(clientEnv);

export const formatErrors = (
  /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
  errors
) =>
  Object.entries(errors)
    .map(([name, value]) => {
      if (value && "_errors" in value) {
        const { _errors, ...rest } = value;
        return `${name}: ${_errors.join(", ")}${Object.keys(rest).length ? formatErrors(rest) : ""}\n`;
      }
    })
    .filter(Boolean);

if (!parsedClientEnv.success || !parseAppStoreClientEnv.success) {
  /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
  let errors = {
    _errors: [],
  };
  if (!parsedClientEnv.success)
    if (parsedClientEnv.error) errors = { ...errors, ...parsedClientEnv.error.format() };

  if (!parseAppStoreClientEnv.success)
    if (parseAppStoreClientEnv.error) errors = { ...errors, ...parseAppStoreClientEnv.error.format() };
  validationFailure(formatErrors(errors));
}

const parseClientEnvData = parsedClientEnv.success ? parsedClientEnv.data : {};
const parseAppStoreClientEnvData = parseAppStoreClientEnv.success ? parseAppStoreClientEnv.data : {};
const clientEnvData = { ...parseClientEnvData, ...parseAppStoreClientEnvData };

for (let key of Object.keys(parseClientEnvData)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ Invalid public environment variable name:", key);

    throw new Error("Invalid public environment variable name");
  }
}

export const env = clientEnvData;
