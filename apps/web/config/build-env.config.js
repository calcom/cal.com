const { z } = require("zod");
const {getValidatedBuildEnv} = require("./getValidatedBuildEnv");


const schema = {
  NEXT_BUILD_ENV_OUTPUT: z
    .enum(['standalone', 'classic'], {
      description:
        'For standalone mode: https://nextjs.org/docs/pages/api-reference/next-config-js/output',
    })
    .default('classic')
};


const buildEnvSchema = z.object(schema);
const buildEnv = getValidatedBuildEnv(buildEnvSchema);


module.exports = { buildEnvSchema, buildEnv };
