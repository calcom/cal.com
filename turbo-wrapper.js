/**
 * This is a wrapper over turbo that is aware if it is being run by turbo or not.
 * If turbo ran it, it executes the actual command, turbo would have already inferred and executed dependencies
 * If turbo didn't run it, it executes the turbo command so that it can now infer and execute dependencies before it executes the actual command
 * Without this turbo aware wrapper, there would be infinite recursion if we simply convert the commands to turbo commands
 *
 * Turborepo has plans to support it out of the box. See https://github.com/vercel/turborepo/issues/550
 */
const execSync = require("child_process").execSync;
const isATurboCommandAlready = !!process.env.TURBO_HASH;
const [command, flags] = process.argv.slice(2).join(" ").split("--");
const path = require("path");
const fs = require("fs");
const yarnScriptName = JSON.parse(process.env.npm_config_argv).original;

let packageInfo;
try {
  packageInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json")));
} catch (e) {
  throw new Error("No package.json found. Command must be run from a folder that has a package.json");
}
const rootDir = __dirname;
if (isATurboCommandAlready) {
  execSync(command, { stdio: "inherit" });
} else {
  execSync(
    `yarn --cwd="${rootDir}" turbo run --scope="${packageInfo.name}" ${yarnScriptName} ${flags || ""}`,
    {
      stdio: "inherit",
    }
  );
}
