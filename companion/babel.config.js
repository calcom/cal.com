module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          "react-compiler": {
            panicThreshold: "all_errors",
          },
        },
      ],
      "nativewind/babel",
    ],
  };
};
