import { ESLintUtils } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator((name) => `https://developer.cal.com/eslint/rule/${name}`);
const rule = createRule({
  create(context) {
    // Track imported names from @calcom/lib/webstorage
    const safeImportedNames = new Set<string>();

    return {
      ImportDeclaration(node) {
        // Check if this is an import from the safe webstorage module
        if (node.source.value === "@calcom/lib/webstorage") {
          node.specifiers.forEach((specifier) => {
            if (specifier.type === "ImportSpecifier") {
              // Track the local name used for the import
              safeImportedNames.add(specifier.local.name);
            }
          });
        }
      },

      CallExpression(node) {
        const webStorages = ["localStorage", "sessionStorage"];
        const callee = node.callee;

        // Check for window.localStorage or window.sessionStorage
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

        // Check for direct localStorage or sessionStorage usage
        if (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          callee.type === "MemberExpression" &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          callee.object?.type === "Identifier" &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          webStorages.includes(callee.object?.name) &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          !safeImportedNames.has(callee.object?.name)
        ) {
          return context.report({
            node: node,
            loc: node.loc,
            messageId: "possible-issue-with-embed",
          });
        }
      },

      // Also check for property access like localStorage.length
      MemberExpression(node) {
        const webStorages = ["localStorage", "sessionStorage"];

        // Check for direct property access on localStorage/sessionStorage
        if (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          node.object?.type === "Identifier" &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          webStorages.includes(node.object?.name) &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          !safeImportedNames.has(node.object?.name)
        ) {
          return context.report({
            node: node,
            loc: node.loc,
            messageId: "possible-issue-with-embed",
          });
        }

        // Check for window.localStorage/sessionStorage property access
        if (
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          node.object?.type === "MemberExpression" &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          node.object?.object?.name === "window" &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          webStorages.includes(node.object?.property?.name)
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
