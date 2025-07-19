import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);

export default createRule({
  name: "no-scroll-into-view-embed",
  meta: {
    docs: {
      description: "Disallow usage of scrollIntoView and scrollIntoViewSmooth in embed mode",
      recommended: "error",
    },
    messages: {
      noScrollIntoViewForEmbed:
        "Make sure to call scrollIntoView/scrollIntoViewSmooth conditionally if it is called without user action. Use useIsEmbed() to detect if embed mode and then don't call it for embed case.",
    },
    type: "problem",
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee } = node;

        if (callee.type === "MemberExpression") {
          if (
            callee.property.type === "Identifier" &&
            (callee.property.name === "scrollIntoView" || callee.property.name === "scrollIntoViewSmooth")
          ) {
            context.report({
              node,
              messageId: "noScrollIntoViewForEmbed",
            });
          }
        } else if (
          callee.type === "Identifier" &&
          (callee.name === "scrollIntoView" || callee.name === "scrollIntoViewSmooth")
        ) {
          context.report({
            node,
            messageId: "noScrollIntoViewForEmbed",
          });
        }
      },
    };
  },
});
