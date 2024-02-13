import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

const rule = createRule({
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "include" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "ObjectExpression" &&
          node.arguments[0].properties.length === 1 &&
          node.arguments[0].properties[0].type === "Property" &&
          node.arguments[0].properties[0].value.type === "Literal" &&
          node.arguments[0].properties[0].value.value === true
        ) {
          context.report({
            node: node,
            messageId: "disallow-prisma-include-only-true",
          });
        }
      },
    };
  },
  name: "disallow-prisma-include-only-true-not-field-selector",
  meta: {
    docs: {
      description: "Disallow Prisma includes using only true, without a field selector",
      recommended: "error",
    },
    messages: {
      "disallow-prisma-include-only-true":
        "Avoid using Prisma includes with only 'true', specify fields explicitly",
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
