#!/usr/bin/env node
// Wrapper script for the enum generator that ensures correct path resolution
// regardless of the current working directory (e.g., running prisma from repo root).
// Prisma resolves providers starting with "./" relative to the schema file directory.
require("ts-node").register({ transpileOnly: true });
require("./enum-generator.ts");
