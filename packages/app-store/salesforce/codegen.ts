import type { CodegenConfig } from "@graphql-codegen/cli";
import { config as dotenvconfig } from "dotenv";

dotenvconfig({ path: "./.env" });

const config: CodegenConfig = {
  schema: "./schema.graphql",
  documents: ["./lib/graphql/documents/queries.ts"],
  ignoreNoDocuments: false,
  generates: {
    "./src/gql/": {
      preset: "client",
    },
  },
  debug: true,
  verbose: true,
};

export default config;
