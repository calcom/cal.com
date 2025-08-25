import { execSync } from "node:child_process";

const forbidden = [
  'from "@calcom/app-store"',
  "from 'packages/app-store/index'",
];
const out = execSync('git grep -nE "(from \\\\\"@calcom/app-store\\\\\\\"|from \\\\\"packages/app-store/index\\\\\\\")" || true', { stdio: "pipe" }).toString();

if (out.trim()) {
  console.error("Forbidden imports found:\n" + out);
  process.exit(1);
} else {
  console.log("✔ no forbidden app-store barrel imports");
}
