import { execSync } from "child_process";

const diff = execSync(`git diff --name-only main`);
console.log("diff", diff.toString());
