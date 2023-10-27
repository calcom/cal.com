import { defineConfig } from "checkly";

/**
 * See https://www.checklyhq.com/docs/cli/project-structure/
 */
const config = defineConfig({
  /* A human friendly name for your project */
  projectName: "calcom-monorepo",
  /** A logical ID that needs to be unique across your Checkly account,
   * See https://www.checklyhq.com/docs/cli/constructs/ to learn more about logical IDs.
   */
  logicalId: "calcom-monorepo",
  /* An optional URL to your Git repo */
  repoUrl: "https://github.com/checkly/checkly-cli",
  /* Sets default values for Checks */
  checks: {
    /* A default for how often your Check should run in minutes */
    frequency: 10,
    /* Checkly data centers to run your Checks as monitors */
    locations: ["us-east-1", "eu-west-1"],
    /* An optional array of tags to organize your Checks */
    tags: ["Web"],
    /** The Checkly Runtime identifier, determining npm packages and the Node.js version available at runtime.
     * See https://www.checklyhq.com/docs/cli/npm-packages/
     */
    runtimeId: "2023.02",
    /* A glob pattern that matches the Checks inside your repo, see https://www.checklyhq.com/docs/cli/using-check-test-match/ */
    checkMatch: "**/__checks__/**/*.check.ts",
    browserChecks: {
      /* A glob pattern matches any Playwright .spec.ts files and automagically creates a Browser Check. This way, you
       * can just write native Playwright code. See https://www.checklyhq.com/docs/cli/using-check-test-match/
       * */
      testMatch: "**/__checks__/**/*.spec.ts",
    },
  },
  cli: {
    /* The default datacenter location to use when running npx checkly test */
    runLocation: "eu-west-1",
    /* An array of default reporters to use when a reporter is not specified with the "--reporter" flag */
    reporters: ["list"],
  },
});

export default config;
