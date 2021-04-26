const withTM = require('next-transpile-modules')(['react-timezone-select']);

module.exports = withTM({
  typescript: {
    ignoreBuildErrors: true,
  },
});
