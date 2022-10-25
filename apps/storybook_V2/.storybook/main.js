const path = require('path');

module.exports = {
  stories: [
    "../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)",
    "../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    {
      name: "storybook-addon-next",
      options: {
        nextConfigPath: path.resolve(__dirname, '../../web/next.config.js'),
      },
    },
  ],
  framework: "@storybook/react",
  core: {
    builder: 'webpack5',
  },
}
