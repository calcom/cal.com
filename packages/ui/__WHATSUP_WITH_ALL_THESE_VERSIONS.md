# Whatsup with all these version?

We're currently in the progress of merging multiple versions of our UI library into one new version.

## Version 1

Anything version 1 is in the root, or in the root folders skeleton, form, booker and apps.

## Version 2

Anything version 2 is in the v2 folder

## New version

We're currently creating all new components following new standards in the components directory. The /styles directory contains the shared tailwind styles.

### Adding new components

For adding new components it is important to take a few patterns into account:

- All components should be added in /components
- All components should be in a folder, no tsx files directly in the root
- All components should contain stories and MDX documentation (which is why they can't live in the root, since that would result in a lot of duplication)

### Migration process

We're currently migrating existing components step by step, this process looks as following:

- New components only should get added in /components
- Any existing components in v2 are reviewed, updated if needed and then moved to the /components directory
- After v2 is moved, the old v2 component should be deleted, as well as any v1 version of that component. All places in the monorepo where we use this component, should use the newest version by then.

### End state

The envisioned end state is a state where only the /components directory exists. In this directory all components should have documentation and stories.
