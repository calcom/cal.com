"use strict";

const path = require("node:path");

const binPath = require.resolve("zod-prisma-types/dist/bin.js", { paths: [__dirname, process.cwd()] });
require(binPath);
