import * as path from "node:path";
import * as fs from "fs-extra";

// First, copyNestSwagger is required to enable "@nestjs/swagger" in the "nest-cli.json",
// because nest-cli.json is resolving "@nestjs/swagger" plugin from
// project's node_modules, but due to dependency hoisting, the "@nestjs/swagger" is located in the root node_modules.
// Second, we need to run this before starting the application using "nest start", because "nest start" is ran by
// "nest-cli" with the "nest-cli.json" file, and for nest cli to be loaded with plugins correctly the "@nestjs/swagger"
// should reside in the project's node_modules already before the "nest start" command is executed.
async function copyNestSwagger() {
  const monorepoRoot = path.resolve(__dirname, "../../../../../");
  const nodeModulesNestjs = path.resolve(__dirname, "../../node_modules/@nestjs");
  const swaggerModulePath = "@nestjs/swagger";

  const sourceDir = path.join(monorepoRoot, "node_modules", swaggerModulePath);
  const targetDir = path.join(nodeModulesNestjs, "swagger");

  if (!(await fs.pathExists(targetDir))) {
    try {
      await fs.ensureDir(nodeModulesNestjs);
      await fs.copy(sourceDir, targetDir);
    } catch (error) {
      console.error("Failed to copy @nestjs/swagger:", error);
    }
  }
}

copyNestSwagger();
