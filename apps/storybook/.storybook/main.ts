import type { StorybookConfig } from "@storybook/nextjs";
import path, { dirname, join } from "path";

const config: StorybookConfig = {
  stories: [
    "../intro.stories.mdx",
    "../../../packages/ui/components/**/*.stories.mdx", // legacy SB6 stories
    "../../../packages/ui/components/**/*.stories.@(js|jsx|ts|tsx)",
    "../../../packages/ui/components/**/*.docs.mdx",
    "../../../packages/features/**/*.stories.@(js|jsx|ts|tsx)",
    "../../../packages/features/**/*.docs.mdx",
    "../../../packages/atoms/**/*.stories.@(js|jsx|ts|tsx)",
    "../../../packages/atoms/**/*.docs.mdx",
  ],

  addons: [
    getAbsolutePath("@storybook/addon-links"),
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("storybook-addon-rtl-direction"),
    getAbsolutePath("storybook-react-i18next"),
  ],

  framework: {
    name: getAbsolutePath("@storybook/nextjs") as "@storybook/nextjs",

    options: {
      // builder: {
      //   fsCache: true,
      //   lazyCompilation: true,
      // },
    },
  },

  staticDirs: ["../public"],

  webpackFinal: async (config, { configType }) => {
    config.resolve = config.resolve || {};
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

    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
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

  typescript: { reactDocgen: "react-docgen" },

  docs: {
    autodocs: true,
  },
};

export default config;

function getAbsolutePath(value) {
  return dirname(require.resolve(join(value, "package.json")));
}
