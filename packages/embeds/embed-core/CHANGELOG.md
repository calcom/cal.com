# @calcom/embed-core

## 1.3.2

### Patch Changes

- Improve UI instruction layout typings

## 1.3.1

### Patch Changes

- layout type fix as zod-utils can't be used in npm package

## 1.3.0

### Minor Changes

- Supports new booker layout

## 1.2.1

### Patch Changes

- Fix the build for embed-react

## 1.2.0

### Minor Changes

- Fix missing types for @calcom/embed-react. Also, release support for floatingButton config parameter. Though the support is available using embed.js already, for users using getCalApi the TypeScript types would report that config isn't supported.

## 1.1.5

### Patch Changes

- Add changesets. Use prepack instead of prePublish and prepublish only as that works with both yarn and npm
