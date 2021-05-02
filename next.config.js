const withTM = require('next-transpile-modules')(['react-timezone-select']);

module.exports = withTM({
  future: {
    webpack5: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  basePath: process.env.BASE_PATH || '',
  async redirects() {
    return [
      {
        source: '/settings',
        destination: '/settings/profile',
        permanent: true,
      }
    ]
  }
});
