import { componentSource } from "@/app/source";
import { createSearchAPI } from "fumadocs-core/search/server";

const indexes = [componentSource].flatMap((src) =>
  src.getPages().map((page) => ({
    title: page.data.title,
    description: page.data.description,
    structuredData: page.data.structuredData,
    id: page.url,
    url: page.url,
  }))
);

export const { GET } = createSearchAPI("advanced", {
  indexes,
});
