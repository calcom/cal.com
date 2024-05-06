import fs from 'fs';
import path from 'path';
import Markdoc from '@markdoc/markdoc';

const DEFAULT_SCHEMA_PATH = './';

function normalize(s) {
  return s.replace(/\\/g, path.win32.sep.repeat(2));
}

async function gatherPartials(ast, schemaDir, tokenizer, parseOptions) {
  let partials = {};

  for (const node of ast.walk()) {
    const file = node.attributes.file;

    if (
      node.type === 'tag' &&
      node.tag === 'partial' &&
      typeof file === 'string' &&
      !partials[file]
    ) {
      const filepath = path.join(schemaDir, file);
      // parsing is not done here because then we have to serialize and reload from JSON at runtime
      const content = await fs.promises.readFile(filepath, {encoding: 'utf8'});

      if (content) {
        const tokens = tokenizer.tokenize(content);
        const ast = Markdoc.parse(tokens, parseOptions);
        partials = {
          ...partials,
          [file]: content,
          ...(await gatherPartials.call(
            this,
            ast,
            schemaDir,
            tokenizer,
            parseOptions
          )),
        };
      }
    }
  }

  return partials;
}

// Returning a JSX object is what allows fast refresh to work
export async function load(source, getResolve, getOptions, resourcePath, addContextDependency, files) {
  // https://webpack.js.org/concepts/module-resolution/
  const resolve = getResolve({
    // https://webpack.js.org/api/loaders/#thisgetresolve
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx', '...'],
    preferRelative: true,
  });

  const {
    dir = ".", // Root directory from Next.js (contains next.config.js)
    mode = 'static',
    schemaPath = DEFAULT_SCHEMA_PATH,
    options: {slots = false, ...options} = {
      allowComments: true,
    },
    nextjsExports = ['metadata', 'revalidate'],
    appDir = false,
  } = getOptions() || {};

  const tokenizer = new Markdoc.Tokenizer(options);
  const parseOptions = {slots};

  const schemaDir = path.resolve(dir, schemaPath || DEFAULT_SCHEMA_PATH);
  const tokens = tokenizer.tokenize(source);
  const ast = Markdoc.parse(tokens, parseOptions);

  // Grabs the path of the file relative to the `/{app,pages}` directory
  // to pass into the app props later.
  // This array access @ index 1 is safe since Next.js guarantees that
  // all pages will be located under either {app,pages}/ or src/{app,pages}/
  // https://nextjs.org/docs/advanced-features/src-directory
  const filepath = resourcePath.split(appDir ? 'app' : 'pages')[1];

  const partials = await gatherPartials.call(
    this,
    ast,
    path.resolve(schemaDir, 'partials'),
    tokenizer,
    parseOptions
  );

  // IDEA: consider making this an option per-page
  const dataFetchingFunction =
    mode === 'server' ? 'getServerSideProps' : 'getStaticProps';

  let schemaCode = 'const schema = {};';
  try {
    const directoryExists = await fs.promises.stat(schemaDir);

    // This creates import strings that cause the config to be imported runtime
    async function importAtRuntime(variable) {
      try {
        const module = await resolve(schemaDir, variable);
        return `import * as ${variable} from '${normalize(module)}'`;
      } catch (error) {
        return `const ${variable} = {};`;
      }
    }

    if (directoryExists) {
      schemaCode = `
        ${await importAtRuntime('config')}
        ${await importAtRuntime('tags')}
        ${await importAtRuntime('nodes')}
        ${await importAtRuntime('functions')}
        const schema = {
          tags: defaultObject(tags),
          nodes: defaultObject(nodes),
          functions: defaultObject(functions),
          ...defaultObject(config),
        };`
        .trim()
        .replace(/^\s+/gm, '');
    }
  } catch (error) {
    // Only throw module not found errors if user is passing a custom schemaPath
    if (schemaPath && schemaPath !== DEFAULT_SCHEMA_PATH) {
      throw new Error(`Cannot find module '${schemaPath}' at '${schemaDir}'`);
    }
  }

  addContextDependency(schemaDir);

  const nextjsExportsCode = nextjsExports
    .map((name) => `export const ${name} = frontmatter.nextjs?.${name};`)
    .join('\n');

  const result = `import React from 'react';
import yaml from 'js-yaml';
// renderers is imported separately so Markdoc isn't sent to the client
import Markdoc, {renderers} from '@markdoc/markdoc'
import components from "@markdoc.components"

import markdocConfig from "@markdoc.config"

import {getSchema, defaultObject} from "@markdoc/runtime";

/**
 * Schema is imported like this so end-user's code is compiled using build-in babel/webpack configs.
 * This enables typescript/ESnext support
 */
${schemaCode}

const tokenizer = new Markdoc.Tokenizer(${
    options ? JSON.stringify(options) : ''
  });

/**
 * Source will never change at runtime, so parse happens at the file root
 */
const source = ${JSON.stringify(source)};
const filepath = ${JSON.stringify(filepath)};
const files = ${JSON.stringify(files)};
const tokens = tokenizer.tokenize(source);
const parseOptions = ${JSON.stringify(parseOptions)};
const ast = Markdoc.parse(tokens, parseOptions);

/**
 * Like the AST, frontmatter won't change at runtime, so it is loaded at file root.
 * This unblocks future features, such a per-page dataFetchingFunction.
 */
const frontmatter = ast.attributes.frontmatter
  ? yaml.load(ast.attributes.frontmatter)
  : {};

//const {...rest} = getSchema(schema)
const rest = markdocConfig;

async function getMarkdocData(context = {}) {
  const partials = ${JSON.stringify(partials)};

  // Ensure Node.transformChildren is available
  Object.keys(partials).forEach((key) => {
    const tokens = tokenizer.tokenize(partials[key]);
    partials[key] = Markdoc.parse(tokens, parseOptions);
  });

  const cfg = {
    ...rest,
    variables: {
      ...(rest ? rest.variables : {}),
      // user can't override this namespace
      markdoc: {frontmatter},
      // Allows users to eject from Markdoc rendering and pass in dynamic variables via getServerSideProps
      ...(context.variables || {})
    },
    partials,
    source,
  };

  /**
   * transform must be called in dataFetchingFunction to support server-side rendering while
   * accessing variables on the server
   */
  const content = await Markdoc.transform(ast, cfg);

  // Removes undefined
  return JSON.parse(
    JSON.stringify({
      content,
      frontmatter,
      file: {
        path: filepath,
      },
      files
    })
  );
}

${
  appDir
    ? ''
    : `export async function ${dataFetchingFunction}(context) {
  return {
    props: {
      markdoc: await getMarkdocData(context),
    },
  };
}`
}
${appDir ? nextjsExportsCode : ''}
export const markdoc = {frontmatter};
export default${appDir ? ' async' : ''} function MarkdocComponent(props) {
  const markdoc = ${appDir ? 'await getMarkdocData()' : 'props.markdoc'};
  // Only execute HMR code in development
  return renderers.react(markdoc.content, React, {
    components: {
      ...components,
      // Allows users to override default components at runtime, via their _app
      ...props.components,
    },
  });
}
`;
  return result;
}