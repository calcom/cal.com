import type { CodegenConfig } from "@graphql-codegen/cli";

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
