import path from 'node:path';
import generateModule from '@babel/generator';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';
import type { Plugin } from 'vite';

type ComponentLocPluginOptions = {
  include?: RegExp;
};

export function componentLocPlugin(options: ComponentLocPluginOptions = {}): Plugin {
  const include = options.include ?? /\.(jsx|tsx)$/;

  // @babel/traverse and @babel/generator are CommonJS modules with default exports.
  // When imported in an ESM context, the default export may be on `.default` or directly on the module.
  // This workaround handles both cases to ensure compatibility across different bundler configurations.
  const traverse =
    (traverseModule as unknown as typeof import('@babel/traverse')).default ??
    (traverseModule as unknown as typeof import('@babel/traverse').default);
  const generate =
    (generateModule as unknown as typeof import('@babel/generator')).default ??
    (generateModule as unknown as typeof import('@babel/generator').default);

  let root: string;

  return {
    name: 'calcom-component-loc',
    enforce: 'pre',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
    },
    transform(code, id) {
      const [filepath] = id.split('?', 1);
      if (filepath.includes('node_modules')) return null;
      if (!include.test(filepath)) return null;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        sourceFilename: filepath,
      });

      let mutated = false;

      // Get relative path from project root
      const relativePath = path.relative(root, filepath);

      traverse(ast, {
        JSXElement(nodePath) {
          const opening = nodePath.node.openingElement;
          const element = nodePath.node;
          if (!opening.loc || !element.loc) return;

          const alreadyTagged = opening.attributes.some(
            (attribute) =>
              t.isJSXAttribute(attribute) &&
              attribute.name.name === 'data-component-file',
          );
          if (alreadyTagged) return;

          opening.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-component-file'),
              t.stringLiteral(relativePath),
            ),
            t.jsxAttribute(
              t.jsxIdentifier('data-component-start'),
              t.stringLiteral(`${element.loc.start.line}:${element.loc.start.column}`),
            ),
            t.jsxAttribute(
              t.jsxIdentifier('data-component-end'),
              t.stringLiteral(`${element.loc.end.line}:${element.loc.end.column}`),
            ),
          );

          mutated = true;
        },
      });

      if (!mutated) return null;

      const output = generate(
        ast,
        { retainLines: true, sourceMaps: true, sourceFileName: id },
        code,
      );
      return { code: output.code, map: output.map };
    },
  };
}

export default componentLocPlugin;
