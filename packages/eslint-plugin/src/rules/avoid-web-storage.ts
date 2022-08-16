import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);
const rule = createRule({
  create(context) {
    return {
      CallExpression(node) {
        const webStorages = ["localStorage", "sessionStorage"];
        const callee = node.callee;
        if (
          // Can't figure out how to fix this TS issue
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          callee.object?.object?.name === "window" &&
          // Can't figure out how to fix this TS issue
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          webStorages.includes(node?.callee?.object?.property?.name)
        ) {
          return context.report({
            node: node,
            loc: node.loc,
            messageId: "possible-issue-with-embed",
          });
        }
      },
    };
  },
  name: "avoid-web-storage",
  meta: {
    fixable: "code",
    docs: {
      description: "Avoid deprecated imports",
      recommended: "warn",
    },
    messages: {
      "possible-issue-with-embed": `Be aware that accessing localStorage/sessionStorage throws error in Chrome Incognito mode when embed is in cross domain context. If you know what you are doing, \`import {localStorage, sessionStorage} from "@calcom/lib/webstorage"\` for safe usage. See https://github.com/calcom/cal.com/issues/2618`,
    },
    type: "suggestion",
    schema: [],
  },
  defaultOptions: [],
});

export default rule;
