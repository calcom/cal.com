// @ts-check

/**
 * This file is included in `/next.config.mjs` which ensures the app isn't built with invalid env vars.
 * It has to be a `.mjs`-file to be imported there.
 */
import { env as clientEnv, formatErrors } from "./client.mjs";
import { serverSchema, appStoreServerSchema } from "./schema.mjs";

const _serverEnv = serverSchema.safeParse(process.env);
const _appStoreServerEnv = appStoreServerSchema.safeParse(process.env);

if (!_serverEnv.success || !_appStoreServerEnv.success) {
  let errors = {};
  if (_serverEnv.error) errors = { ...errors, ..._serverEnv.error.format() };
  if (_appStoreServerEnv.error) errors = { ...errors, ..._appStoreServerEnv.error.format() };
  console.error("❌ Invalid environment variables:\n", ...formatErrors(errors));
  throw new Error("Invalid environment variables");
}

const serverEnvData = { ..._serverEnv.data, ..._appStoreServerEnv.data };

for (let key of Object.keys(serverEnvData)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ You are exposing a server-side env-variable:", key);

    throw new Error("You are exposing a server-side env-variable");
  }
}

export const env = { ...serverEnvData, ...clientEnv };
