const { exitOrThrowError, printValidatedEnv } = require("./utils");

/**
 * Return a validated / transformed environment object from a zodSchema
 *
 * Validated build envs are shown in the console by default. In case of error it will
 * exit/die with an error indicating missing requirements
 *
*/
const getValidatedBuildEnv = (zodSchema, options = {}) => {
  const { env = process.env, displayConsole = true } = options ?? {};
  const parsedEnv = zodSchema.safeParse(env);
  if (parsedEnv.success) {
    if (displayConsole) {
      printValidatedEnv('Build env(s)', parsedEnv);
    }
    return parsedEnv.data;
  }
  exitOrThrowError(parsedEnv);
};

module.exports = { getValidatedBuildEnv };