# @calcom/embed-react

## 1.5.0

### Minor Changes

- Added namespacing support throughout

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.5.0
  - @calcom/embed-snippet@1.3.0

## 1.4.0

### Minor Changes

- Added a few more events

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.4.0
  - @calcom/embed-snippet@1.2.0

## 1.3.0

### Minor Changes

- Fix module import of the embed-react package

## 1.2.2

### Patch Changes

- Improve UI instruction layout typings
- Updated dependencies
  - @calcom/embed-snippet@1.1.2
  - @calcom/embed-core@1.3.2

## 1.2.1

### Patch Changes

- layout type fix as zod-utils can't be used in npm package
- Updated dependencies
  - @calcom/embed-snippet@1.1.1
  - @calcom/embed-core@1.3.1

## 1.2.0

### Minor Changes

- Supports new booker layout

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.3.0
  - @calcom/embed-snippet@1.1.0

## 1.1.1

### Patch Changes

- Fix the build for embed-react
- Updated dependencies
  - @calcom/embed-snippet@1.0.9
  - @calcom/embed-core@1.2.1

## 1.1.0

### Minor Changes

- Fix missing types for @calcom/embed-react. Also, release support for floatingButton config parameter. Though the support is available using embed.js already, for users using getCalApi the TypeScript types would report that config isn't supported.

### Patch Changes

- Updated dependencies
  - @calcom/embed-core@1.2.0
  - @calcom/embed-snippet@1.0.8

## 1.0.12

### Patch Changes

- Add changesets. Use prepack instead of prePublish and prepublish only as that works with both yarn and npm
- Updated dependencies
  - @calcom/embed-snippet@1.0.7
  - @calcom/embed-core@1.1.5
