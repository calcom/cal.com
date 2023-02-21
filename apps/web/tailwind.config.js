const basePreset = require("@calcom/config/tailwind-preset");
const joinPreset = require("@calcom/config/tailwind-join-preset");

function createUnion(obj1, obj2) {
  let union = {};
  // "Set" must be used to handle special charcters in object's values
  // eg. for (% character):
  // "fade-in-up": {
  //   "0%": {
  //     opacity: 1
  //   }
  // },
  let keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  for (let key of keys) {
    if (Array.isArray(obj2[key])) {
      union[key] = obj2[key];
    } else if (
      typeof obj1[key] === "object" &&
      obj1[key] !== null &&
      typeof obj2[key] === "object" &&
      obj2[key] !== null
    ) {
      union[key] = createUnion(obj1[key], obj2[key]);
    } else {
      union[key] = obj2[key] || obj1[key];
    }
  }
  return union;
}

const joinTheme = createUnion(basePreset, joinPreset);

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...joinTheme,
  content: [...joinTheme.content],
};
