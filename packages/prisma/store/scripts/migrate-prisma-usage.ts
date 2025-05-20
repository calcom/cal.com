#!/usr/bin/env ts-node
import { execSync } from "child_process";
import path from "path";

const patterns = [
  'import prisma from "@calcom/prisma"',
  'import { prisma } from "@calcom/prisma"',
  'import { PrismaClient } from "@calcom/prisma"',
];

function categorizeFile(filePath: string): string {
  if (filePath.includes("/app/api/cron/")) {
    return "Cron Jobs";
  } else if (filePath.includes("/app/api/")) {
    return "API Routes (App Router)";
  } else if (filePath.includes("/pages/api/")) {
    return "API Routes (Pages Router)";
  } else if (filePath.includes("/trpc/server/routers/")) {
    return "tRPC Procedures";
  } else if (filePath.includes("/repository/")) {
    return "Repository Classes";
  } else if (filePath.includes("/playwright/") || filePath.includes("/test/")) {
    return "Test Files";
  } else if (filePath.includes("/api/v2/src/")) {
    return "NestJS API (v2)";
  } else {
    return "Utility Functions";
  }
}

function findFiles() {
  const repoRoot = path.resolve(__dirname, "../../../../");
  const categories: Record<string, string[]> = {
    "API Routes (App Router)": [],
    "API Routes (Pages Router)": [],
    "NestJS API (v2)": [],
    "tRPC Procedures": [],
    "Repository Classes": [],
    "Utility Functions": [],
    "Test Files": [],
    "Cron Jobs": [],
  };

  let allFiles: string[] = [];
  for (const pattern of patterns) {
    try {
      const result = execSync(`grep -r "${pattern}" --include="*.ts" --include="*.tsx" ${repoRoot}`, {
        encoding: "utf8",
      });
      const files = result
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split(":")[0])
        .filter((filePath) => !filePath.includes("node_modules"));

      allFiles = [...allFiles, ...files];
    } catch (error) {
      console.error(`Error searching for pattern ${pattern}:`, error);
    }
  }

  allFiles = [...new Set(allFiles)];

  for (const file of allFiles) {
    const category = categorizeFile(file);
    categories[category].push(file);
  }

  console.log("# Migration Summary\n");
  console.log("| Category | Total Files | Migrated | Remaining |");
  console.log("|----------|-------------|----------|-----------|");

  let totalFiles = 0;
  for (const [category, files] of Object.entries(categories)) {
    const migrated = category === "tRPC Procedures" ? files.length : 0;
    console.log(`| ${category} | ${files.length} | ${migrated} | ${files.length - migrated} |`);
    totalFiles += files.length;
  }
  console.log(
    `| **Total** | **${totalFiles}** | **${categories["tRPC Procedures"].length}** | **${
      totalFiles - categories["tRPC Procedures"].length
    }** |\n`
  );

  for (const [category, files] of Object.entries(categories)) {
    if (files.length === 0) continue;

    console.log(`### ${category}`);
    files.forEach((file, index) => {
      const relativePath = file.replace(repoRoot, "");
      console.log(`${index + 1}. \`${relativePath}\` - 🔴 Not Started`);
    });
    console.log("\n");
  }
}

findFiles();
