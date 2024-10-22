module.exports = (path, options) => {
  // Call the defaultResolver, so we leverage its cache, error handling, etc.
  return options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg) => {
      // See https://github.com/microsoft/accessibility-insights-web/blob/40416a4ae6b91baf43102f58e069eff787de4de2/src/tests/common/resolver.js
      if (pkg.name === "uuid" || pkg.name === "nanoid") {
        delete pkg["exports"];
        delete pkg["module"];
      }
      return pkg;
    },
  });
};
