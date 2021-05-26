const withTM = require('next-transpile-modules')(['react-timezone-select']);
const { i18n } = require('./next-i18next.config');

module.exports = withTM({
  i18n,
  future: {
    webpack5: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
});
