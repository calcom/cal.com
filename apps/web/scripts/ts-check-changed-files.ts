import { execSync } from "child_process";

type Err = {
  stdout: string;
};

const diff = execSync(`git diff --name-only origin/main HEAD`).toString();

const files = diff
  .trim()
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

console.log("ℹ️ Changed files:");
console.log(files.map((str) => `  - ${str}`).join("\n"));

try {
  console.log("⏳ Checking type errors..");
  execSync("yarn tsc --noEmit", {});

  console.log("😻 No errors!");
} catch (_err) {
  const err = _err as Err;

  const output = err.stdout.toString() as string;

  const filesWithTypeErrors = files.filter((file) => output.includes(file));

  if (!filesWithTypeErrors.length) {
    console.log(`🎉 You haven't introduced any new type errors!`);
    process.exit(0);
  }
  console.log("❌ ❌ ❌ You seem to have touched files that have type errors ❌ ❌ ❌");
  console.log("🙏 Please inspect the following files:");
  console.log(filesWithTypeErrors.map((str) => `  - ${str}`).join("\n"));

  process.exit(1);
}
