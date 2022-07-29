// @ts-check
import { clientEnv, clientSchema, appStoreClientSchema } from "./schema.mjs";

const _clientEnv = clientSchema.safeParse(clientEnv);
const _appStoreClientEnv = appStoreClientSchema.safeParse(clientEnv);

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

if (!_clientEnv.success || !_appStoreClientEnv.success) {
  let errors = {};
  if (_clientEnv.error) errors = { ...errors, ..._clientEnv.error.format() };
  if (_appStoreClientEnv.error) errors = { ...errors, ..._appStoreClientEnv.error.format() };
  console.error("❌ Invalid environment variables:\n", ...formatErrors(errors));
  throw new Error("Invalid environment variables");
}

const clientEnvData = { ..._clientEnv.data, ..._appStoreClientEnv.data };

for (let key of Object.keys(_clientEnv.data)) {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ Invalid public environment variable name:", key);

    throw new Error("Invalid public environment variable name");
  }
}

export const env = clientEnvData;
