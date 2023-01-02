// @ts-check

/**
 * This file is included in `/next.config.mjs` which ensures the app isn't built with invalid env vars.
 * It has to be a `.mjs`-file to be imported there.
 */
import validationFailure from "./_validationFailure.mjs";
import { env as clientEnv, formatErrors } from "./client.mjs";
import { variablesDefinedInSchema, serverSchema, appStoreServerSchema, allEnv } from "./schema.mjs";

const _serverEnv = serverSchema.safeParse(allEnv);
const _appStoreServerEnv = appStoreServerSchema.safeParse(allEnv);

if (!_serverEnv.success || !_appStoreServerEnv.success) {
  /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
  let errors = {
    _errors: [],
  };

  if (!_serverEnv.success) if (_serverEnv.error) errors = { ...errors, ..._serverEnv.error.format() };

  if (!_appStoreServerEnv.success)
    if (_appStoreServerEnv.error) errors = { ...errors, ..._appStoreServerEnv.error.format() };
  validationFailure(formatErrors(errors));
}

let undefinedVariables = [];
for (const [variableName, exists] of Object.entries(variablesDefinedInSchema)) {
  if (!exists) {
    undefinedVariables.push(variableName);
  }
}

if (undefinedVariables.length) {
  console.warn(
    "\x1b[33mwarn",
    "\x1b[0m",
    `Following variables are not defined in schema, they would still be available in process.env but they haven't been validated.`,
    undefinedVariables.toString()
  );
}
const _serverEnvData = _serverEnv.success ? _serverEnv.data : {};
const _appStoreServerEnvData = _appStoreServerEnv.success ? _appStoreServerEnv.data : {};
const serverEnvData = { ..._serverEnvData, ..._appStoreServerEnvData };

for (let key of Object.keys(serverEnvData)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    console.warn("❌ You are exposing a server-side env-variable:", key);

    throw new Error("You are exposing a server-side env-variable");
  }
}

console.log(
  "✅ All environment variables defined in schema have been validated. Those not defined in schema are still available in process.env but they haven't been validated."
);
export const env = { ...serverEnvData, ...clientEnv };
