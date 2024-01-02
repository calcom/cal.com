
# DELETE THE `project.inlang.json` FILE

The `project.inlang.json` file is now contained in a project directory e.g. `project.inlang/settings.json`.


## What you need to do

1. Update the inlang CLI (if you use it) to use the new path `project.inlang` instead of `project.inlang.json`.
2. Delete the `project.inlang.json` file.


## Why is this happening?

See this RFC https://docs.google.com/document/d/1OYyA1wYfQRbIJOIBDliYoWjiUlkFBNxH_U2R4WpVRZ4/edit#heading=h.pecv6xb7ial6 
and the following GitHub issue for more information https://github.com/inlang/monorepo/issues/1678.

- Monorepo support https://github.com/inlang/monorepo/discussions/258. 
- Required for many other future features like caching, first class offline support, and more. 
- Stablize the inlang project format.
