// This registers Typescript compiler instance onto node.js.
// Now it is possible to just require typescript files without any compilation steps in the environment run by node
require("ts-node-maintained").register({
  compilerOptions: {
    module: "commonjs",
  },
});

// re-export our rules so that eslint run by node can understand them
module.exports = {
  // import our rules from the typescript file
  rules: require("./rules/index.ts").default,
  // import our config from the typescript file
  configs: require("./configs/index.ts").default,
};
