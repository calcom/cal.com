const path = require("path");

module.exports = {
  stories: ["../stories/**/*.stories.mdx", "../stories/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "storybook-addon-designs",
    "@storybook/addon-a11y",
    "storybook-addon-next",
  ],
  framework: "@storybook/react",
  core: {
    builder: "webpack5",
  },
  webpackFinal: async (config) => {
    /**
     * Fixes font import with /
     * @see https://github.com/storybookjs/storybook/issues/12844#issuecomment-867544160
     */
    config.resolve.roots = [path.resolve(__dirname, "../public"), "node_modules"];

    /**
     * Why webpack5... Just why?
     * @type {{console: boolean, process: boolean, timers: boolean, os: boolean, querystring: boolean, sys: boolean, fs: boolean, url: boolean, crypto: boolean, path: boolean, zlib: boolean, punycode: boolean, util: boolean, stream: boolean, assert: boolean, string_decoder: boolean, domain: boolean, vm: boolean, tty: boolean, http: boolean, buffer: boolean, constants: boolean, https: boolean, events: boolean}}
     */
    config.resolve.fallback = {
      fs: false,
      assert: false,
      buffer: false,
      console: false,
      constants: false,
      crypto: false,
      domain: false,
      events: false,
      http: false,
      https: false,
      os: false,
      path: false,
      punycode: false,
      process: false,
      querystring: false,
      stream: false,
      string_decoder: false,
      sys: false,
      timers: false,
      tty: false,
      url: false,
      util: false,
      vm: false,
      zlib: false,
    };

    return config;
  },
};
