// This is a workaround for https://github.com/jsdom/jsdom/issues/2524#issuecomment-902027138

// See https://github.com/microsoft/accessibility-insights-web/blob/40416a4ae6b91baf43102f58e069eff787de4de2/src/tests/unit/jest-setup.ts
const { TextEncoder, TextDecoder } = require("node:util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
