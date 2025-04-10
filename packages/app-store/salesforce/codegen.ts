import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as dotenvconfig } from "dotenv";

dotenvconfig({ path: "./.env" });

const config: CodegenConfig = {
  schema: [
    {
      // eslint-disable-next-line
      [`${process.env.SALESFORCE_INSTANCE_URL}/services/data/v63.0/graphql`]: {
        headers: {
          // eslint-disable-next-line
          Authorization: `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`,
        },
      },
    },
  ],
  documents: ["./lib/graphql/documents/queries.ts"],
  ignoreNoDocuments: false,
  generates: {
    "./src/gql/": {
      preset: "client",
    },
  },
  debug: true,
};

export default config;
