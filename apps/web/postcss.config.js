const config = {
  plugins: {
    tailwindcss: {},
  },
};

if (process.env.NODE_ENV === "production") {
  config.plugins.autoprefixer = {};
}

module.exports = config;
