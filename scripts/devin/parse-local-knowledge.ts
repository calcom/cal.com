#!/usr/bin/env -S npx ts-node

import * as fs from "fs";
import * as path from "path";

interface DevinKnowledgeEntry {
  name: string;
  body: string;
  trigger_description: string;
  folder?: string;
}

interface DevinKnowledgeFolder {
  name: string;
  description: string;
}

interface DevinKnowledgeOutput {
  folders: DevinKnowledgeFolder[];
  knowledge: DevinKnowledgeEntry[];
}

interface RuleFrontmatter {
  title: string;
  impact: string;
  impactDescription: string;
  tags: string;
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

  const frontmatter: Partial<RuleFrontmatter> = {};
  const lines = frontmatterStr.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      (frontmatter as Record<string, string>)[key] = value;
    }
  }

  return {
    frontmatter: frontmatter as RuleFrontmatter,
    body,
  };
}

function parseRuleFile(filePath: string, fileName: string): DevinKnowledgeEntry {
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  const name = frontmatter?.title || fileName.replace(".md", "").replace(/-/g, " ");
  const tags = frontmatter?.tags || "";
  const impact = frontmatter?.impact || "";
  const impactDesc = frontmatter?.impactDescription || "";

  let triggerDescription = `Use this rule when working on Cal.com codebase`;
  if (tags) {
    triggerDescription += ` and the task involves: ${tags}`;
  }
  if (impact) {
    triggerDescription += `. Impact: ${impact}`;
  }

  return {
    name: `[Rule] ${name}`,
    body,
    trigger_description: triggerDescription,
    folder: "Rules",
  };
}

function parseKnowledgeBaseSections(filePath: string): DevinKnowledgeEntry[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const entries: DevinKnowledgeEntry[] = [];

  const sectionRegex = /^## (.+)$/gm;
  const sections: { title: string; startIndex: number }[] = [];

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sections.push({
      title: match[1],
      startIndex: match.index,
    });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];
    const endIndex = nextSection ? nextSection.startIndex : content.length;
    const sectionContent = content.substring(section.startIndex, endIndex).trim();

    const title = section.title;
    // Section titles in knowledge-base.md must start with "When..." (enforced by validate-local-knowledge.ts)
    // so we use the title directly as the trigger description
    entries.push({
      name: title,
      body: sectionContent,
      trigger_description: title,
      folder: "Domain Knowledge",
    });
  }

  return entries;
}

function parseCommandsFile(filePath: string): DevinKnowledgeEntry {
  const content = fs.readFileSync(filePath, "utf-8");

  return {
    name: "Cal.com Build, Test & Development Commands",
    body: content,
    trigger_description:
      "When you need to run commands in the Cal.com repository such as build, test, lint, type-check, database operations, or development server",
    folder: "Commands",
  };
}

function main() {
  const agentsDir = path.join(__dirname, "..", "..", "agents");
  const rulesDir = path.join(agentsDir, "rules");

  const output: DevinKnowledgeOutput = {
    folders: [
      {
        name: "Rules",
        description: "Engineering rules and standards for Cal.com development",
      },
      {
        name: "Domain Knowledge",
        description: "Product and domain-specific knowledge for Cal.com",
      },
      {
        name: "Commands",
        description: "Build, test, and development commands for Cal.com",
      },
    ],
    knowledge: [],
  };

  // Parse rules directory
  if (fs.existsSync(rulesDir)) {
    const ruleFiles = fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "_template.md" && f !== "_sections.md");

    for (const ruleFile of ruleFiles) {
      const filePath = path.join(rulesDir, ruleFile);
      const entry = parseRuleFile(filePath, ruleFile);
      output.knowledge.push(entry);
    }
  }

  // Parse knowledge-base.md
  const knowledgeBasePath = path.join(agentsDir, "knowledge-base.md");
  if (fs.existsSync(knowledgeBasePath)) {
    const sections = parseKnowledgeBaseSections(knowledgeBasePath);
    output.knowledge.push(...sections);
  }

  // Parse commands.md
  const commandsPath = path.join(agentsDir, "commands.md");
  if (fs.existsSync(commandsPath)) {
    const entry = parseCommandsFile(commandsPath);
    output.knowledge.push(entry);
  }

  // Write output
  const outputPath = path.join(agentsDir, "devin-knowledge.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Generated ${output.knowledge.length} knowledge entries in ${output.folders.length} folders`);
  console.log(`Output written to: ${outputPath}`);

  // Print summary
  const folderCounts: Record<string, number> = {};
  for (const entry of output.knowledge) {
    const folder = entry.folder || "Uncategorized";
    folderCounts[folder] = (folderCounts[folder] || 0) + 1;
  }

  console.log("\nSummary by folder:");
  for (const [folder, count] of Object.entries(folderCounts)) {
    console.log(`  ${folder}: ${count} entries`);
  }
}

main();
