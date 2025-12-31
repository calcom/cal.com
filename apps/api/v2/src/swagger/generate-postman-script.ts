import "dotenv/config";

import process from "node:process";
import { generatePostmanCollection } from "./generate-postman";

generatePostmanCollection()
  .then(() => {
    console.log("✅ Postman collection generation completed successfully");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("❌ Failed to generate Postman collection", { error: error.stack });
    process.exit(1);
  });
