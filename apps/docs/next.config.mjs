import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { createLoader } from "simple-functional-loader";
import path from "path";
import fs from "fs";
import matter from "gray-matter";

import { load } from "./markdoc/loader.mjs"

const buildTree = (dir, parentName = "pages") => {
  const result = {};
  const list = fs.readdirSync(dir);
  result.name = parentName;
  for (const item of list) {
    if (item.startsWith("_app.")) {
      continue;
    }
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      result.folders = [...(result.folders || []), buildTree(itemPath, item)];
    } else {
      const frontmatter = matter(
        fs.readFileSync(itemPath, { encoding: "utf-8" })
      );
      const p = path
        .join(
          path.dirname(itemPath),
          path.basename(itemPath, path.extname(itemPath))
        )
        .replace(/^pages/, "")
        .replace(/\/index$/, "");
      result.files = [
        ...(result.files || []),
        {
          name: item,
          path: p,
          meta: frontmatter.data,
        },
      ];
    }
  }
  return result;
};

const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx", "mdoc"],
  resolve: {
    extensions: [".mdx", ".md"],
  },
  webpack(config, options) {
    const files = buildTree("./pages");

    config.module.rules.push({
      test: { and: [/\.mdx$/] },
      use: [
        options.defaultLoaders.babel,
        createLoader(function (source) {
          // If source already had an explicitly defined `meta`
          // (caught and transformed into `__motif_meta__` in the
          // previous loader), this will take precedence, and
          // the one extracted from the frontmatter will be ignored.
          if (/export\s+(const|let|var)\s+__motif_meta__\s*=/.test(source)) {
            source = source
              .replace(
                /export\s+(const|let|var)\s+meta\s*=/,
                "export $1 __motif_frontmatter__ ="
              )
              .replace(
                /export\s+(const|let|var)\s+__motif_meta__\s*=\s*{/,
                "export $1 meta = {\n  ...__motif_frontmatter__,"
              );
          }
          const pathSegments = this.resourcePath.split(path.sep);
          const filename = pathSegments.slice(-1)[0];
          return `${source}
MDXContent.meta=meta
MDXContent.filename="${filename}"
MDXContent.files=${JSON.stringify(files)}`;
        }),
        {
          loader: "@mdx-js/loader",
          options: {
            providerImportSource: "@mdx-js/react",
            remarkPlugins: [
              remarkMath,
              remarkGfm,
              remarkFrontmatter,
              [remarkMdxFrontmatter, { name: "meta" }],
            ],
            rehypePlugins: [],
          },
        },
        createLoader(function (source) {
          return source.replace(
            /export\s+(const|let|var)\s+meta\s*=/,
            "export $1 __motif_meta__ ="
          );
        }),
      ],
    }
    , {
      test: { and: [/\.mdoc$/] },
      use: [
        options.defaultLoaders.babel,
        createLoader(function (source) {
            const callback = this.async();
            try {
              load(source, this.getResolve, this.getOptions, this.resourcePath, this.addContextDependency, files).then(res => {
                callback(null, res);
              })
            } catch (error) {
              console.error(error);
              callback(error);
            }
          }),
        ],
      }
    );

    return config;
  },
};

export default nextConfig;