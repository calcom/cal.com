import fs from "fs";
import path from "path";
import YAML from "yaml";

// The place to grab next-swagger-doc generated code from.
const openApiSpecUrl = "http://localhost:3002/docs";

// main function to allow async/await in Node versions that don;t support it at the top-level
async function main() {
  const openApiResponse = await fetch(openApiSpecUrl);

  if (!openApiResponse.ok) {
    throw new Error(`OpenAPI spec could not be fetched from ${openApiSpecUrl}`);
  }

  const openApiSpec = await openApiResponse.json();

  // Create public directory if it does not exist
  const publicDirPath = path.resolve(__dirname, "../public");
  try {
    if (!fs.existsSync(publicDirPath)) {
      fs.mkdirSync(publicDirPath);
    }
  } catch (err) {
    console.error(err);
  }

  fs.writeFileSync(path.resolve(publicDirPath, "openapi.json"), JSON.stringify(openApiSpec));
  fs.writeFileSync(path.resolve(publicDirPath, "openapi.yaml"), YAML.stringify(openApiSpec));
}

main();
