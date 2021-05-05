const withTM = require('next-transpile-modules')(['react-timezone-select']);

module.exports = withTM({
  future: {
    webpack5: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
});
