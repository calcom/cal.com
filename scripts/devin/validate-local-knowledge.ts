#!/usr/bin/env -S npx ts-node

/**
 * Validates the format of files in the agents/ directory.
 * - Rules files must have proper frontmatter (title, tags)
 * - Knowledge-base sections must start with "When..."
 *
 * Exit code 0 = valid, Exit code 1 = invalid
 */

import process from "node:process";
import * as fs from "fs";
import * as path from "path";

interface ValidationError {
  file: string;
  message: string;
}

interface RuleFrontmatter {
  title?: string;
  impact?: string;
  impactDescription?: string;
  tags?: string;
}

function parseFrontmatter(content: string): {
  frontmatter: RuleFrontmatter | null;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2].trim();

  const frontmatter: RuleFrontmatter = {};
  const lines = frontmatterStr.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      (frontmatter as Record<string, string>)[key] = value;
    }
  }

  return { frontmatter, body };
}

function validateRuleFile(filePath: string, fileName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter } = parseFrontmatter(content);

  if (!frontmatter) {
    errors.push({
      file: `rules/${fileName}`,
      message: "Missing YAML frontmatter. Rules must have frontmatter with title and tags.",
    });
    return errors;
  }

  if (!frontmatter.title || frontmatter.title.trim() === "") {
    errors.push({
      file: `rules/${fileName}`,
      message: "Missing 'title' in frontmatter. Add a descriptive title for this rule.",
    });
  }

  if (!frontmatter.tags || frontmatter.tags.trim() === "") {
    errors.push({
      file: `rules/${fileName}`,
      message:
        "Missing 'tags' in frontmatter. Add comma-separated tags to help Devin know when to apply this rule.",
    });
  }

  return errors;
}

function validateKnowledgeBase(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const content = fs.readFileSync(filePath, "utf-8");

  // Find all ## headers
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const invalidSections: string[] = [];

  while ((match = sectionRegex.exec(content)) !== null) {
    const title = match[1].trim();

    // Section titles must start with "When..." for clear trigger descriptions
    if (!title.toLowerCase().startsWith("when ")) {
      invalidSections.push(title);
    }
  }

  if (invalidSections.length > 0) {
    errors.push({
      file: "knowledge-base.md",
      message: `The following sections don't have clear trigger descriptions. Consider renaming them to start with "When..." to help Devin know when to use this knowledge:\n${invalidSections.map((s) => `    - "${s}"`).join("\n")}`,
    });
  }

  return errors;
}

function main() {
  const agentsDir = path.join(path.dirname(__filename), "..", "..", "agents");
  const rulesDir = path.join(agentsDir, "rules");
  const knowledgeBasePath = path.join(agentsDir, "knowledge-base.md");

  const allErrors: ValidationError[] = [];

  console.log("Validating agents/ directory format...\n");

  // Validate rules files
  if (fs.existsSync(rulesDir)) {
    const ruleFiles = fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "_template.md" && f !== "_sections.md");

    console.log(`Checking ${ruleFiles.length} rule files...`);

    for (const ruleFile of ruleFiles) {
      const filePath = path.join(rulesDir, ruleFile);
      const errors = validateRuleFile(filePath, ruleFile);
      allErrors.push(...errors);
    }
  }

  // Validate knowledge-base.md
  if (fs.existsSync(knowledgeBasePath)) {
    console.log("Checking knowledge-base.md...");
    const errors = validateKnowledgeBase(knowledgeBasePath);
    allErrors.push(...errors);
  }

  // Report results
  console.log("");

  if (allErrors.length === 0) {
    console.log("All files are valid!");
    process.exit(0);
  } else {
    console.log(`Found ${allErrors.length} validation error(s):\n`);

    for (const error of allErrors) {
      console.log(`[ERROR] ${error.file}`);
      console.log(`  ${error.message}\n`);
    }

    console.log("Please fix the above errors before merging.");
    process.exit(1);
  }
}

main();
