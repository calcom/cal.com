import { defineCollections, defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

export const { docs, meta } = defineDocs();

export const components = defineCollections({
  dir: "content/design",
  schema: frontmatterSchema.extend({
    airtableId: z.string().optional(),
    designStatus: z
      .enum(["Needs changes", "In progress", "Ready for dev", "Not started"])
      .default("In progress"),
    devStatus: z
      .enum(["Changes requested", "Ready for review", "Not started", "Needs Changes", "Approved"])
      .default("Not started"),
  }),
  type: "doc",
});

export default defineConfig({
  lastModifiedTime: "git",
});
