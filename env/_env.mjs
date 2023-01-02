// @ts-check
import { config as dotEnvConfig } from "dotenv";

const commonEnv = dotEnvConfig({ path: "../../.env" });
// In a fresh setup, prismaEnv is same as commonEnv. But read them separately for old deployments as they can be different
const prismaEnv = dotEnvConfig({ path: "../../packages/prisma/.env" });
const appStoreEnv = dotEnvConfig({ path: "../../.env.appStore" });

/**
 * @type {import("dotenv").DotenvParseOutput}
 */
const commonEnvData = commonEnv.parsed ? commonEnv.parsed : {};
/**
 * @type {import("dotenv").DotenvParseOutput}
 */
const prismaEnvData = prismaEnv.parsed ? prismaEnv.parsed : {};
/**
 * @type {import("dotenv").DotenvParseOutput}
 */
const appStoreEnvData = appStoreEnv.parsed ? appStoreEnv.parsed : {};

/**
 *
 * @param {import("dotenv").DotenvParseOutput} env1
 * @param  {import("dotenv").DotenvParseOutput[]} envs
 * @returns
 */
const mergeEnv = (env1, ...envs) => {
  let mergedEnv = env1;
  for (const env of envs) {
    for (const [key, value] of Object.entries(env)) {
      if (env[key] === undefined) {
        // Don't override existing env variables
        env[key] = value;
      }
    }
  }

  return mergedEnv;
};

/**
 * @type {typeof process.env}
 */
// We aren't using process.env during zod parse so that the unknown env variables we get are not system env variables. It reduces the noise.
export const allEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ...mergeEnv(commonEnvData, prismaEnvData, appStoreEnvData),
};
