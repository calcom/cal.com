/* eslint-disable @typescript-eslint/no-explicit-any */
import jsonLogic from "json-logic-js";

// converts input to lowercase if string
function normalize(input: any) {
  return typeof input === "string" ? input.toLowerCase() : input;
}

jsonLogic.add_operation("==", function (a: any, b: any) {
  return normalize(a) == normalize(b);
});

jsonLogic.add_operation("===", function (a: any, b: any) {
  return normalize(a) === normalize(b);
});

jsonLogic.add_operation("!==", function (a: any, b: any) {
  return normalize(a) !== normalize(b);
});

jsonLogic.add_operation("!=", function (a: any, b: any) {
  return normalize(a) != normalize(b);
});

jsonLogic.add_operation("in", function (a: any, b: any) {
  const first = normalize(a);
  const second = normalize(b);
  if (!second || typeof second.indexOf === "undefined") return false;
  return second.indexOf(first) !== -1;
});

export default jsonLogic;
