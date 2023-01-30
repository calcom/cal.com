const path = require("path");

module.exports = {
  stories: [
    "../intro.stories.mdx",
    "../../../packages/ui/components/**/*.stories.mdx",
    "../../../packages/atoms/**/*.stories.mdx",
    "../../../packages/features/**/*.stories.mdx",
    "../../../packages/ui/components/**/*.stories.@(js|jsx|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "storybook-addon-rtl-direction",
    "storybook-react-i18next",
    "storybook-addon-next",
    /*{
      name: "storybook-addon-next",
      options: {
        nextConfigPath: path.resolve(__dirname, "../../web/next.config.js"),
      },
    },*/
  ],
  framework: "@storybook/react",
  core: {
    builder: "webpack5",
  },
  staticDirs: ["../public"],
  webpackFinal: async (config, { configType }) => {
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

    config.module.rules.push({
      test: /\.css$/,
      use: [
        "style-loader",
        {
          loader: "css-loader",
          options: {
            modules: true, // Enable modules to help you using className
          },
        },
      ],
      include: path.resolve(__dirname, "../src"),
    });

    return config;
  },
  typescript: { reactDocgen: 'react-docgen' }
};
