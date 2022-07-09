// This registers Typescript compiler instance onto node.js.
// Now it is possible to just require typescript files without any compilation steps in the environment run by node
require("ts-node").register();

// import our rules from the typescript file
const rules = require("./index.ts").default;

// re-export our rules so that eslint run by node can understand them
module.exports = {
  rules,
};
