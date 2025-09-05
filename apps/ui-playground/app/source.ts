import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";
import { components, docs, meta } from "@/.source";

export const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs, meta),
});

export const componentSource = loader({
  baseUrl: "/design",
  source: createMDXSource(components, []),
});
