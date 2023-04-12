const { ConcatSource } = require("webpack-sources");

class ImportTimingPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap("ImportTimingPlugin", (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: "ImportTimingPlugin",
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          const chunkGraph = compilation.chunkGraph;

          for (const chunk of compilation.chunks) {
            const entryModulesIterable = chunkGraph.getChunkEntryModulesIterable(chunk);
            if (!entryModulesIterable || entryModulesIterable.size === 0) continue;

            const asset = compilation.getAsset(chunk.files[0]);
            if (!asset) continue;
            const wrappedSource = new ConcatSource(
              `
              (function() {
                const originalRequire = require;
                require = function(moduleId) {
                  const moduleName = typeof moduleId === 'number' ? moduleId : moduleId.toString();
                  console.time("require: " + moduleName);
                  const result = originalRequire.apply(this, arguments);
                  console.timeEnd("require: " + moduleName);
                  return result;
                };
              })();
              `,
              asset.source
            );

            compilation.updateAsset(chunk.files[0], wrappedSource);
          }
        }
      );
    });
  }
}

module.exports = ImportTimingPlugin;
