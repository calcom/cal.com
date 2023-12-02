# Starter project

This is an empty project that is scaffolded out when you run `npx @temporalio/create@latest ./myfolder` and choose the `empty` option.

* Add your Activity Definitions to `src/activities.ts`.
* Add your Workflow Definitions to `src/workflows.ts`.
* Set your task queue name in `src/shared.ts`.
* Modify the `src/client.ts` file and replace `YOUR_WORKFLOW` with the name of your Workflow.
* Add Activity and Workflow tests to the `src/mocha` directory in files with the extension `.test.ts`.

## Running the code

Install dependencies with `npm install`.

Run `temporal server start-dev` to start [Temporal Server](https://github.com/temporalio/cli/#installation).

The `package.json` file contains scripts for running the client, the Worker, and tests.

1. In a shell, run `npm run start.watch` to start the Worker and reload it when code changes.
1. In another shell, run `npm run workflow` to run the Workflow Client.
1. Run `npm run format` to format your code according to the rules in `.prettierrc`.
1. Run `npm run lint` to lint your code according to the rules in `eslintrc.js`.
1. Run `npm test` to run the tests.
