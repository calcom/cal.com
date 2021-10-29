module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log("------ 💯 Adding test coverage support 💯 ------");
    plugins.push("istanbul");
  }

  // need this to suppress storybook warnings
  plugins.push(["@babel/plugin-proposal-private-methods", { loose: true }]);
  plugins.push(["@babel/plugin-proposal-private-property-in-object", { loose: true }]);
  plugins.push(["@babel/plugin-proposal-class-properties", { loose: true }]);

  return {
    presets: ["next/babel"],
    plugins,
  };
};
