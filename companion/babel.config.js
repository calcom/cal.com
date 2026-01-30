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
            sources: (filename) => {
              // Exclude video screen from React Compiler - dynamic imports not supported
              if (filename.includes("app/video/[bookingUid].tsx")) {
                return false;
              }
              return true;
            },
          },
        },
      ],
      "nativewind/babel",
    ],
  };
};
