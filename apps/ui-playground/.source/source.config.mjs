// source.config.ts
import { defineCollections, defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";
var { docs, meta } = defineDocs();
var components = defineCollections({
  dir: "content/design",
  schema: frontmatterSchema.extend({
    airtableId: z.string().optional(),
    designStatus: z.enum(["Needs changes", "In progress", "Ready for dev", "Not started"]).default("In progress"),
    devStatus: z.enum(["Changes requested", "Ready for review", "Not started", "Needs Changes", "Approved"]).default("Not started")
  }),
  type: "doc"
});
var source_config_default = defineConfig({
  lastModifiedTime: "git"
});
export {
  components,
  source_config_default as default,
  docs,
  meta
};
