import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { Logger } from "@nestjs/common";
import Converter from "openapi-to-postmanv2";

interface PostmanCollection {
  info: {
    name: string;
    description: string | { content: string; type: string };
  };
  variable?: {
    key: string;
    value: string;
    type: string;
    description?: string;
  }[];
}

interface ConversionResult {
  result: boolean;
  reason?: string;
  output: { data: PostmanCollection }[];
}

const nodeRequire: NodeRequire = createRequire(__filename);
const biomeBin: string = nodeRequire.resolve("@biomejs/biome/bin/biome");
const logger: Logger = new Logger("PostmanGenerator");

const COLLECTION_DESCRIPTION = `Official Postman collection for Cal.com API v2.

This collection is automatically generated from the Cal.com OpenAPI specification and provides a convenient way to test and integrate with Cal.com's scheduling API.

## Getting Started

1. Set the \`bearerToken\` variable with your Cal.com API key
2. For Platform OAuth endpoints, set \`clientId\` and \`clientSecret\` variables
3. Start making API requests!

## Documentation

For full API documentation, visit: https://cal.com/docs/api-reference/v2/introduction`;

const COLLECTION_VARIABLES: PostmanCollection["variable"] = [
  {
    key: "baseUrl",
    value: "https://api.cal.com",
    type: "string",
    description: "Base URL for the Cal.com API",
  },
  {
    key: "bearerToken",
    value: "",
    type: "string",
    description: "Your Cal.com API key (for API key authentication)",
  },
  {
    key: "clientId",
    value: "",
    type: "string",
    description: "OAuth client ID (for Platform OAuth authentication)",
  },
  {
    key: "clientSecret",
    value: "",
    type: "string",
    description: "OAuth client secret (for Platform OAuth authentication)",
  },
];

function customizeCollection(collection: PostmanCollection): void {
  collection.info.name = "Cal.com API v2";
  collection.info.description = {
    content: COLLECTION_DESCRIPTION,
    type: "text/markdown",
  };
  collection.variable = COLLECTION_VARIABLES;
}

function writeCollection(collection: PostmanCollection, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), "utf8");
  spawnSync("node", [biomeBin, "format", "--write", outputPath], { stdio: "inherit" });
}

export async function generatePostmanCollection(): Promise<void> {
  const openApiPath = path.resolve(__dirname, "../../../../docs/api-reference/v2/openapi.json");
  const postmanOutputPath = path.resolve(
    __dirname,
    "../../../../docs/api-reference/v2/postman-collection.json"
  );

  if (!fs.existsSync(openApiPath)) {
    logger.warn("OpenAPI spec not found. Skipping Postman collection generation.");
    return;
  }

  logger.log("Generating Postman collection from OpenAPI spec...");

  const openApiSpec: unknown = JSON.parse(fs.readFileSync(openApiPath, "utf8"));

  return new Promise((resolve, reject) => {
    Converter.convert(
      { type: "json", data: openApiSpec },
      {
        folderStrategy: "Tags",
        requestNameSource: "Fallback",
        optimizeConversion: true,
        collapseFolders: false,
      },
      (err: Error | null, result: ConversionResult) => {
        if (err) {
          reject(err);
          return;
        }

        if (!result.result) {
          reject(new Error(`Conversion failed: ${result.reason}`));
          return;
        }

        const collection = result.output[0].data;
        customizeCollection(collection);
        writeCollection(collection, postmanOutputPath);

        logger.log(`Postman collection generated at ${postmanOutputPath}`);
        resolve();
      }
    );
  });
}
