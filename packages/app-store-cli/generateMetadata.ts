import fs from "fs";
import path from "path";
import { z } from "zod";

// Define the schema for the app metadata based on the provided config.json
export const AppMetaSchema = z.object({
  "/*": z.string().optional(), // This can be used as a comment-like field, it's optional
  name: z.string().optional(),
  slug: z.string().optional(),
  type: z.string().optional(),
  logo: z.string().optional(),
  url: z.string().url().optional(),
  variant: z.string().optional(),
  categories: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  extendsFeature: z.string().optional(),
  isTemplate: z.boolean().optional(),
  __createdUsingCli: z.boolean().optional(),
  __template: z.string().optional(),
  dirName: z.string().optional(),
  scope: z.string().optional(),
  isOAuth: z.boolean().optional(),
});

const appsDir = path.resolve(__dirname, "../app-store");
const templatesDir = path.resolve(__dirname, "../app-store/templates");

function generateMetadataForDirectory(directory: string) {
  const folderNames = fs.readdirSync(directory);

  folderNames.forEach((folder) => {
    const folderPath = path.join(directory, folder);
    const configPath = path.join(folderPath, "config.json");
    const outputPath = path.join(folderPath, "metadata.generated.ts");

    if (!fs.existsSync(configPath)) {
      return;
    }

    try {
      const rawData = fs.readFileSync(configPath, "utf-8");
      const parsedData = AppMetaSchema.parse(JSON.parse(rawData)); // Validate JSON

      const tsContent = `
                /* This file is auto-generated for ${folder}. Do not modify directly. */
                export const metadata = ${JSON.stringify(parsedData, null, 2)} as const;
            `;

      fs.writeFileSync(outputPath, tsContent);
    } catch (error) {}
  });
}

export function generateMetadataForAllApps() {
  // Generate metadata for apps
  generateMetadataForDirectory(appsDir);

  // Generate metadata for templates
  generateMetadataForDirectory(templatesDir);
}
