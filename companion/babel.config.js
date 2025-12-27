module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          "react-compiler": {
            compilationMode: "all",
            panicThreshold: "all_errors",
            sources: (filename) => {
              // Exclude non-React files from compilation
              if (filename.includes("/services/")) return false;
              if (filename.includes("/utils/")) return false;
              return true;
            },
          },
        },
      ],
      "nativewind/babel",
    ],
  };
};
