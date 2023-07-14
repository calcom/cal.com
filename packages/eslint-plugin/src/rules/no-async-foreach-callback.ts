import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "forEach"
        ) {
          const firstArg = node.arguments[0];
          if (
            (firstArg.type === "ArrowFunctionExpression" || firstArg.type === "FunctionExpression") &&
            firstArg.async
          ) {
            context.report({
              node,
              messageId: "async-foreach",
            });
          }
        }
      },
    };
  },
  name: "no-async-foreach-callback",
  meta: {
    docs: {
      description: "Disallow using an async function as a forEach callback",
      recommended: "warn",
    },
    messages: {
      "async-foreach": "forEach callbacks should not be async, did you mean to use Promise.all?",
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
