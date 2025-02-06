import { defineCollections, defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";

export const { docs, meta } = defineDocs();

export const components = defineCollections({
  dir: "content/design",
  schema: frontmatterSchema.extend({}),
  type: "doc",
});

export default defineConfig({
  lastModifiedTime: "git",
});
