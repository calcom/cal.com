import "dotenv/config";

import { bootstrap } from "../bootstrap";
import { createNestApp } from "../main";
import { generateSwaggerForApp } from "../swagger/generate-swagger";

generateSwagger()
  .then(() => {
    console.log("✅ Swagger generation completed successfully");
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error("❌ Failed to generate swagger", { error: error.stack });
    process.exit(1);
  });

async function generateSwagger(): Promise<void> {
  const app = await createNestApp();

  try {
    bootstrap(app);
    await generateSwaggerForApp(app);
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await app.close();
  }
}
