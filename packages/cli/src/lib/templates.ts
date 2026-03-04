import * as fs from "node:fs";
import * as path from "node:path";

const templatesDir = path.join(__dirname, "../templates");

export function successPage(): string {
  return fs.readFileSync(path.join(templatesDir, "success.html"), "utf-8");
}

export function errorPage(errorDesc: string): string {
  const template = fs.readFileSync(path.join(templatesDir, "error.html"), "utf-8");
  return template.replace("{{ERROR_MESSAGE}}", errorDesc);
}
