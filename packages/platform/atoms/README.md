Customizable UI components to integrate scheduling into your services.

## Users guide

### Support
Currently supports React 18, React 19, Next 14 and Next 15.

### Changelog 
1. Changelog can be viewed [here](https://github.com/calcom/cal.com/blob/main/packages/platform/atoms/CHANGELOG.md).
2. For upcoming changes in the next release click [here](https://github.com/calcom/cal.com/pulls?q=is%3Apr+is%3Aopen+%22chore%3A+version+packages%22+in%3Atitle) to see a pull request titled `chore: version packages` containing next release changes.

### Versioning
1. We use semantic versioning meaning that all updates except major should be safe to update.
2. If there are breaking changes within a specific version it will be marked as `❗️Breaking change` in the changelog, so please check it out before updating.
3. Some of the versions are suffixed e.g. `1.0.102-framer` and are intended for isolated use cases, so you most probably
want to use version without any suffix e.g. `1.0.103`.

### Documentation 
Documentation on how to get started with platform solution is [here](https://cal.com/docs/platform/quickstart) and list of atoms can be viewed
[here](https://cal.com/docs/platform/atoms/cal-provider)

## Contributors guide

### Versioning
We use a tool called changesets that helps documenting changes related to your development branch and then manages
atoms versioning and publishing to [npm](https://www.npmjs.com/package/@calcom/atoms). We need to add a log documenting changes and then letting changesets to gather the changes, update Changelog and update version in `package.json`.

1. Let's say you are on a development branch and just finished adding a new feature to atoms. While on the development branch, you have to add a log documenting this feature so that it later ends up in the atoms [CHANGELOG.md](https://github.com/calcom/cal.com/blob/main/packages/platform/atoms/CHANGELOG.md).
- Run `yarn changesets-add` from monorepo root and then select `@calcom/atoms` using space bar and press enter to go to the next step.
- Then, you have to select whether this is a major, minor or patch update following semantic versioning. Since it is a feature skip major by pressing enter and then select minor by pressing space bar and press enter to go to the next step.
- Then, you have to write a description of the change and press enter. This will generate a log file in the `.changeset` directory e.g. `.changeset/hungry-donuts-cross.md`. 
- Commit this log file to your development branch and push it.
Notably, you do not have to change `"version"` in the atoms `package.json` file because changesets will do it in the next step.
2. After the development branch is merged changesets will open a pull request titled `chore: version packages` containing next release changes. This pull request will contain the new log file, it being added to the atoms `CHANGELOG.md` file and changesets will update the atoms `package.json` file based whether or not is is major, minor or patch update. When we want to release atoms we simply have to merge this pull request and changesets will publish the new atoms version to npm. Notably,
changesets will publish atoms to npm only if the `"version"` in the atoms `package.json` of changeset's PR is higher than in the npm.

The following 2 articles teach how to write good change summaries for each PR when it deserves to end up in CHANGELOG.md
- https://keepachangelog.com/en/1.0.0/
- https://docs.gitlab.com/development/changelog/

### Testing
Atoms are tested in CI using e2e tests within the example platform app. To run them locally:
1. Go to "packages/platform/atoms" and run `yarn dev-on` and then `yarn build` - this will create local build of atoms.
2. Setup environment variables in "packages/platform/examples/base/.env" file. You will need your own platform oAuth client to populate NEXT_PUBLIC_X_CAL_ID (oAuth id), X_CAL_SECRET_KEY (oAuth secret), VITE_BOOKER_EMBED_OAUTH_CLIENT_ID (oAuth id) and ORGANIZATION_ID (organization id to which oAuth client belongs) - all of these are available in the platform settings dashboard after creating the oAuth client.
```
NEXT_PUBLIC_X_CAL_ID=""
X_CAL_SECRET_KEY=""
NEXT_PUBLIC_CALCOM_API_URL="https://api.cal.com/v2"
VITE_BOOKER_EMBED_OAUTH_CLIENT_ID=""
VITE_BOOKER_EMBED_API_URL="https://api.cal.com/v2"
ORGANIZATION_ID=""
```
3. Go to "packages/platform/examples/base" and run `yarn dev:e2e` - this will start the example platform app and run e2e tests by using locally built atoms. Because it is not running within CI it will open a browser and run tests.


