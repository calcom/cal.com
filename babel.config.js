module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.log("------ 💯 Adding test coverage support 💯 ------");
    plugins.push("istanbul");
  }

  return {
    presets: ["next/babel"],
    plugins,
  };
};
