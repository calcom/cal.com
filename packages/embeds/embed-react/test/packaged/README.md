# Packaged

The tests in this file are run on the packaged code that is published to npm. The packaged code is different from the source code in atleast the following ways

- Not all files go to packaged code.If package.json -> files field is specified then only the files that are specified there would be published. So, one might accidentally miss an important file that's available otherwise.
- The packaged code doesn't have .ts files. Those files are actually converted to .js files and .d.ts files are generated separately for TypeScript support. It allows the package to work in both TypeScript and non TypeScript environments.
